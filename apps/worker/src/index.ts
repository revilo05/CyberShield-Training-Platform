import 'dotenv/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';

import { startWebhookDelivery } from './webhooks.js';
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://cybershield:cybershield@localhost:5432/cybershield';
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
const fromEmail = process.env.SES_FROM_EMAIL;
const tokenTtlHours = Number(process.env.SIMULATION_TOKEN_TTL_HOURS ?? 72);
const pool = new Pool({ connectionString: databaseUrl, max: 5 });
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const queue = new Queue('cybershield-campaigns', { connection, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 500, removeOnFail: 1000 } });
const deadLetter = new Queue('cybershield-campaigns-dlq', { connection });
const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

async function send(to: string, subject: string, token: string) {
  const link = `${webOrigin}/?simulationToken=${encodeURIComponent(token)}`;
  if (!fromEmail) return { provider: 'LOCAL', messageId: `local-${randomUUID()}` };
  const result = await ses.send(new SendEmailCommand({ FromEmailAddress: fromEmail, Destination: { ToAddresses: [to] }, Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Html: { Data: `<p>Tienes una nueva actividad de seguridad.</p><p><a href="${link}">Revisar actividad</a></p>`, Charset: 'UTF-8' }, Text: { Data: `Revisa la actividad: ${link}`, Charset: 'UTF-8' } } } } }));
  return { provider: 'AWS_SES', messageId: result.MessageId ?? randomUUID() };
}

async function processCampaign(campaignId: string, companyId: string) {
  const campaign = await pool.query(`UPDATE campaigns SET status='RUNNING',started_at=COALESCE(started_at,NOW()),updated_at=NOW() WHERE id=$1 AND company_id=$2 AND status IN ('SCHEDULED','RUNNING') RETURNING *`, [campaignId, companyId]);
  if (!campaign.rows[0]) return;
  const targets = await pool.query(`SELECT ct.id,ct.user_id,u.email,v.subject FROM campaign_targets ct JOIN users u ON u.id=ct.user_id JOIN campaigns c ON c.id=ct.campaign_id JOIN scenario_versions v ON v.id=c.scenario_version_id WHERE ct.campaign_id=$1 AND ct.company_id=$2 AND ct.target_status='PENDING' ORDER BY ct.created_at`, [campaignId, companyId]);
  for (const target of targets.rows) {
    const current = await pool.query('SELECT status FROM campaigns WHERE id=$1 AND company_id=$2', [campaignId, companyId]);
    if (!current.rows[0] || ['PAUSED','CANCELLED'].includes(current.rows[0].status)) break;
    const token = randomBytes(32).toString('base64url'), hash = createHash('sha256').update(token).digest('hex');
    const claimed = await pool.query(`UPDATE campaign_targets SET token_hash=$2,token_expires_at=NOW()+($3 || ' hours')::interval,target_status='SENDING' WHERE id=$1 AND target_status='PENDING' RETURNING id`, [target.id, hash, tokenTtlHours]);
    if (!claimed.rowCount) continue;
    const client = await pool.connect();
    try {
      const delivery = await send(target.email, target.subject, token);
      await client.query('BEGIN');
      await client.query(`INSERT INTO delivery_attempts(company_id,campaign_target_id,attempt_number,provider,provider_message_id,status,sent_at) VALUES($1,$2,1,$3,$4,'DELIVERED',NOW())`, [companyId, target.id, delivery.provider, delivery.messageId]);
      await client.query(`INSERT INTO behavior_events(company_id,user_id,campaign_id,scenario_version_id,event_type,idempotency_key,occurred_at) SELECT $1,$2,c.id,c.scenario_version_id,'DELIVERED',$3,NOW() FROM campaigns c WHERE c.id=$4 ON CONFLICT DO NOTHING`, [companyId, target.user_id, `delivery:${target.id}`, campaignId]);
      await client.query(`UPDATE campaign_targets SET target_status='DELIVERED',delivered_at=NOW() WHERE id=$1`, [target.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK'); await pool.query(`UPDATE campaign_targets SET target_status='PENDING',token_hash=NULL,token_expires_at=NULL WHERE id=$1`, [target.id]); throw error;
    } finally {
      client.release();
    }
  }
  const remaining = await pool.query(`SELECT COUNT(*)::int AS count FROM campaign_targets WHERE campaign_id=$1 AND target_status IN ('PENDING','SENDING')`, [campaignId]);
  if (remaining.rows[0].count === 0) {
    await pool.query(`UPDATE campaigns SET status='COMPLETED',completed_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='RUNNING'`, [campaignId]);
    await pool.query(`INSERT INTO outbox_events(company_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,'campaign.completed','CAMPAIGN',$2,$3)`, [companyId, campaignId, JSON.stringify({ campaignId, companyId })]);
  }
}

const worker = new Worker('cybershield-campaigns', async (job) => { if (job.name === 'CAMPAIGN.SCHEDULED') await processCampaign(String(job.data.campaignId), String(job.data.companyId)); }, { connection, concurrency: 5, limiter: { max: Number(process.env.CAMPAIGN_RATE_LIMIT ?? 20), duration: 1000 } });
worker.on('failed', async (job, error) => { if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) await deadLetter.add(job.name, { ...job.data, failedJobId: job.id, error: error.message }, { jobId: `dlq-${job.id}` }); });

async function publishOutbox() {
  const events = await pool.query(`SELECT * FROM outbox_events WHERE processed_at IS NULL AND available_at<=NOW() AND event_type='CAMPAIGN.SCHEDULED' ORDER BY created_at LIMIT 100`);
  for (const event of events.rows) {
    await queue.add(event.event_type, event.payload, { jobId: `outbox-${event.id}` });
    await pool.query('UPDATE outbox_events SET processed_at=NOW(),attempts=attempts+1 WHERE id=$1 AND processed_at IS NULL', [event.id]);
  }
}
const poller = setInterval(() => void publishOutbox().catch((error) => console.error({ message: 'outbox polling failed', error })), 2000);
const stopWebhooks = startWebhookDelivery(pool, connection);
await publishOutbox(); console.log('CyberShield worker ready');
async function shutdown() { clearInterval(poller); await worker.close(); await queue.close(); await deadLetter.close(); await stopWebhooks(); await connection.quit(); await pool.end(); }
process.on('SIGTERM', () => void shutdown()); process.on('SIGINT', () => void shutdown());
