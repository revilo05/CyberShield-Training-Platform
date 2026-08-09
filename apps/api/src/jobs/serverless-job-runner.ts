import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import type { Pool } from 'pg';
import type { AppConfig } from '../config/env.js';

type OutboxEvent = {
  id: string;
  company_id: string;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempts: number;
  created_at: Date;
  lock_id: string;
};

export type JobRunSummary = {
  claimed: number;
  completed: number;
  rescheduled: number;
  deadLettered: number;
  errors: Array<{ eventId: string; message: string }>;
};

export class ServerlessJobRunner {
  private readonly ses: SESv2Client;

  constructor(
    private readonly pool: Pool,
    private readonly config: AppConfig,
    private readonly fetchImplementation: typeof fetch = fetch
  ) {
    this.ses = new SESv2Client({ region: config.aws.region });
  }

  async run(): Promise<JobRunSummary> {
    const events = await this.claimEvents();
    const summary: JobRunSummary = { claimed: events.length, completed: 0, rescheduled: 0, deadLettered: 0, errors: [] };
    for (const event of events) {
      try {
        const completed = await this.process(event);
        if (completed) {
          await this.complete(event);
          summary.completed += 1;
        } else {
          await this.reschedule(event, 5, null);
          summary.rescheduled += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const deadLettered = event.attempts >= 8;
        await this.fail(event, message, deadLettered);
        summary.errors.push({ eventId: event.id, message });
        if (deadLettered) summary.deadLettered += 1;
        else summary.rescheduled += 1;
      }
    }
    return summary;
  }

  private async claimEvents(): Promise<OutboxEvent[]> {
    const lockId = randomUUID();
    const result = await this.pool.query<OutboxEvent>(
      "WITH candidates AS (SELECT id FROM outbox_events WHERE processed_at IS NULL AND dead_lettered_at IS NULL AND available_at<=NOW() AND (locked_at IS NULL OR locked_at<NOW()-INTERVAL '5 minutes') ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED) UPDATE outbox_events AS event SET locked_at=NOW(),lock_id=$2,attempts=event.attempts+1,last_error=NULL FROM candidates WHERE event.id=candidates.id RETURNING event.*",
      [this.config.jobs.outboxBatchSize, lockId]
    );
    return result.rows;
  }

  private async process(event: OutboxEvent): Promise<boolean> {
    if (event.event_type === 'CAMPAIGN.SCHEDULED') return this.processCampaign(event);
    if (['campaign.completed', 'simulation.reported', 'risk.changed', 'assignment.created'].includes(event.event_type)) {
      await this.deliverWebhooks(event);
    }
    return true;
  }

  private async processCampaign(event: OutboxEvent): Promise<boolean> {
    const campaignId = String(event.payload.campaignId ?? event.aggregate_id);
    const companyId = String(event.payload.companyId ?? event.company_id);
    await this.pool.query("UPDATE campaigns SET status='RUNNING',started_at=COALESCE(started_at,NOW()),updated_at=NOW() WHERE id=$1 AND company_id=$2 AND status='SCHEDULED'", [campaignId, companyId]);
    const campaign = await this.pool.query<{ status: string }>('SELECT status FROM campaigns WHERE id=$1 AND company_id=$2', [campaignId, companyId]);
    const status = campaign.rows[0]?.status;
    if (!status || ['PAUSED', 'CANCELLED', 'COMPLETED'].includes(status)) return true;
    if (status !== 'RUNNING') throw new Error('Campaign cannot run from status ' + status + '.');

    const targets = await this.pool.query<{ id: string; user_id: string; email: string; subject: string }>(
      "SELECT ct.id,ct.user_id,u.email,v.subject FROM campaign_targets ct JOIN users u ON u.id=ct.user_id AND u.company_id=ct.company_id JOIN campaigns c ON c.id=ct.campaign_id AND c.company_id=ct.company_id JOIN scenario_versions v ON v.id=c.scenario_version_id WHERE ct.campaign_id=$1 AND ct.company_id=$2 AND ct.target_status='PENDING' ORDER BY ct.created_at LIMIT $3",
      [campaignId, companyId, this.config.jobs.campaignBatchSize]
    );

    for (const target of targets.rows) {
      const current = await this.pool.query<{ status: string }>('SELECT status FROM campaigns WHERE id=$1 AND company_id=$2', [campaignId, companyId]);
      if (current.rows[0]?.status !== 'RUNNING') break;
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const claimed = await this.pool.query(
        "UPDATE campaign_targets SET token_hash=$2,token_expires_at=NOW()+($3 || ' hours')::interval,target_status='SENDING' WHERE id=$1 AND company_id=$4 AND target_status='PENDING' RETURNING id",
        [target.id, tokenHash, this.config.simulationTokenTtlHours, companyId]
      );
      if (!claimed.rowCount) continue;
      const attempts = await this.pool.query<{ attempt_number: number }>('SELECT COALESCE(MAX(attempt_number),0)::int+1 AS attempt_number FROM delivery_attempts WHERE campaign_target_id=$1', [target.id]);
      const attemptNumber = attempts.rows[0]?.attempt_number ?? 1;
      try {
        const delivery = await this.sendCampaignEmail(target.email, target.subject, token);
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query("INSERT INTO delivery_attempts(company_id,campaign_target_id,attempt_number,provider,provider_message_id,status,sent_at) VALUES($1,$2,$3,$4,$5,'DELIVERED',NOW())", [companyId, target.id, attemptNumber, delivery.provider, delivery.messageId]);
          await client.query("INSERT INTO behavior_events(company_id,user_id,campaign_id,scenario_version_id,event_type,idempotency_key,occurred_at) SELECT $1,$2,c.id,c.scenario_version_id,'DELIVERED',$3,NOW() FROM campaigns c WHERE c.id=$4 AND c.company_id=$1 ON CONFLICT(company_id,idempotency_key) DO NOTHING", [companyId, target.user_id, 'delivery:' + target.id, campaignId]);
          await client.query("UPDATE campaign_targets SET target_status='DELIVERED',delivered_at=NOW() WHERE id=$1 AND company_id=$2", [target.id, companyId]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.pool.query("INSERT INTO delivery_attempts(company_id,campaign_target_id,attempt_number,provider,status,error_message) VALUES($1,$2,$3,$4,'FAILED',$5) ON CONFLICT(campaign_target_id,attempt_number) DO NOTHING", [companyId, target.id, attemptNumber, this.config.aws.configured ? 'AWS_SES' : 'LOCAL', message.slice(0, 2000)]);
        await this.pool.query("UPDATE campaign_targets SET target_status='PENDING',token_hash=NULL,token_expires_at=NULL WHERE id=$1 AND company_id=$2 AND target_status='SENDING'", [target.id, companyId]);
        throw error;
      }
    }

    const remaining = await this.pool.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM campaign_targets WHERE campaign_id=$1 AND company_id=$2 AND target_status IN ('PENDING','SENDING')", [campaignId, companyId]);
    if ((remaining.rows[0]?.count ?? 0) > 0) return false;
    const completed = await this.pool.query("UPDATE campaigns SET status='COMPLETED',completed_at=NOW(),updated_at=NOW() WHERE id=$1 AND company_id=$2 AND status='RUNNING' RETURNING id", [campaignId, companyId]);
    if (completed.rowCount) {
      await this.pool.query("INSERT INTO outbox_events(company_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,'campaign.completed','CAMPAIGN',$2,$3)", [companyId, campaignId, JSON.stringify({ campaignId, companyId })]);
    }
    return true;
  }

  private async sendCampaignEmail(to: string, subject: string, token: string) {
    if (!this.config.aws.sesFromEmail) {
      if (this.config.nodeEnv === 'production') throw new Error('SES_FROM_EMAIL is required before sending production campaigns.');
      return { provider: 'LOCAL' as const, messageId: 'local-' + randomUUID() };
    }
    const link = this.config.webOrigin + '/?simulationToken=' + encodeURIComponent(token);
    const result = await this.ses.send(new SendEmailCommand({
      FromEmailAddress: this.config.aws.sesFromEmail,
      Destination: { ToAddresses: [to] },
      Content: { Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: '<p>Tienes una nueva actividad de seguridad.</p><p><a href="' + link + '">Revisar actividad</a></p>', Charset: 'UTF-8' },
          Text: { Data: 'Revisa la actividad: ' + link, Charset: 'UTF-8' }
        }
      } }
    }));
    return { provider: 'AWS_SES' as const, messageId: result.MessageId ?? randomUUID() };
  }

  private async deliverWebhooks(event: OutboxEvent): Promise<void> {
    const subscriptions = await this.pool.query<{ id: string; url: string; secret_hash: string }>('SELECT id,url,secret_hash FROM webhook_subscriptions WHERE company_id=$1 AND active=TRUE AND $2=ANY(event_types)', [event.company_id, event.event_type]);
    for (const subscription of subscriptions.rows) {
      const url = new URL(subscription.url);
      if (url.protocol !== 'https:' || !this.config.webhookAllowedHosts.includes(url.hostname.toLowerCase())) {
        throw new Error('Webhook ' + subscription.id + ' has a non-allowlisted destination.');
      }
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ id: event.id, type: event.event_type, createdAt: event.created_at, data: event.payload });
      const signature = createHmac('sha256', subscription.secret_hash).update(timestamp + '.' + body).digest('hex');
      const response = await this.fetchImplementation(subscription.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'CyberShield-Webhooks/1.0', 'x-cybershield-timestamp': timestamp, 'x-cybershield-signature': 'v1=' + signature, 'x-cybershield-delivery': event.id },
        body,
        signal: AbortSignal.timeout(10_000),
        redirect: 'error'
      });
      if (!response.ok) throw new Error('Webhook ' + subscription.id + ' returned HTTP ' + response.status + '.');
    }
  }

  private async complete(event: OutboxEvent): Promise<void> {
    await this.pool.query('UPDATE outbox_events SET processed_at=NOW(),published_at=COALESCE(published_at,NOW()),locked_at=NULL,lock_id=NULL,last_error=NULL WHERE id=$1 AND lock_id=$2', [event.id, event.lock_id]);
  }

  private async reschedule(event: OutboxEvent, delaySeconds: number, message: string | null): Promise<void> {
    await this.pool.query("UPDATE outbox_events SET available_at=NOW()+($3 || ' seconds')::interval,locked_at=NULL,lock_id=NULL,last_error=$4 WHERE id=$1 AND lock_id=$2", [event.id, event.lock_id, delaySeconds, message]);
  }

  private async fail(event: OutboxEvent, message: string, deadLettered: boolean): Promise<void> {
    if (deadLettered) {
      await this.pool.query('UPDATE outbox_events SET dead_lettered_at=NOW(),locked_at=NULL,lock_id=NULL,last_error=$3 WHERE id=$1 AND lock_id=$2', [event.id, event.lock_id, message.slice(0, 2000)]);
      return;
    }
    await this.reschedule(event, Math.min(900, 2 ** Math.min(event.attempts, 9)), message.slice(0, 2000));
  }
}
