import { createHmac } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import type IORedis from 'ioredis';
import type { Pool } from 'pg';

export function startWebhookDelivery(pool: Pool, connection: IORedis) {
  const queue = new Queue('cybershield-webhooks', { connection, defaultJobOptions: { attempts: 8, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 500 } });
  const dlq = new Queue('cybershield-webhooks-dlq', { connection });
  const worker = new Worker('cybershield-webhooks', async (job) => {
    const subscriptions = await pool.query('SELECT id,url,secret_hash FROM webhook_subscriptions WHERE company_id=$1 AND active=TRUE AND $2=ANY(event_types)', [job.data.companyId, job.name]);
    for (const subscription of subscriptions.rows) {
      const timestamp = Math.floor(Date.now() / 1000).toString(), body = JSON.stringify({ id: job.data.outboxId, type: job.name, createdAt: job.data.createdAt, data: job.data.payload });
      const signature = createHmac('sha256', subscription.secret_hash).update(`${timestamp}.${body}`).digest('hex');
      const response = await fetch(subscription.url, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'CyberShield-Webhooks/1.0', 'x-cybershield-timestamp': timestamp, 'x-cybershield-signature': `v1=${signature}`, 'x-cybershield-delivery': String(job.data.outboxId) }, body, signal: AbortSignal.timeout(10_000), redirect: 'error' });
      if (!response.ok) throw new Error(`Webhook ${subscription.id} respondió HTTP ${response.status}`);
    }
  }, { connection, concurrency: 10 });
  worker.on('failed', async (job, error) => { if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) await dlq.add(job.name, { ...job.data, error: error.message }, { jobId: `dlq-${job.id}` }); });
  const publish = async () => { const events = await pool.query(`SELECT * FROM outbox_events WHERE processed_at IS NULL AND available_at<=NOW() AND event_type IN ('campaign.completed','simulation.reported','risk.changed','assignment.created') ORDER BY created_at LIMIT 100`); for (const event of events.rows) { await queue.add(event.event_type, { outboxId: event.id, companyId: event.company_id, createdAt: event.created_at, payload: event.payload }, { jobId: `webhook-${event.id}` }); await pool.query('UPDATE outbox_events SET processed_at=NOW(),attempts=attempts+1 WHERE id=$1 AND processed_at IS NULL', [event.id]); } };
  const timer = setInterval(() => void publish().catch((error) => console.error({ message: 'webhook outbox polling failed', error })), 3000); void publish();
  return async () => { clearInterval(timer); await worker.close(); await queue.close(); await dlq.close(); };
}
