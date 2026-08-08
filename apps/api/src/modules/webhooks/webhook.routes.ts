import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { AppConfig } from '../../config/env.js';
import type { PlatformRepository } from '../../core/enterprise-models.js';
import { createAuthentication, requireRoles } from '../auth/enterprise-auth.js';

const allowedEvents = ['campaign.completed','simulation.reported','risk.changed','assignment.created'] as const;
export function createWebhookRouter(pool: Pool, repository: PlatformRepository, config: AppConfig) {
  const router = Router(); router.use(createAuthentication(repository, config)); router.use(requireRoles('ADMIN'));
  router.get('/v1/webhooks', async (req, res, next) => { try { const result = await pool.query('SELECT id,url,event_types,active,created_at FROM webhook_subscriptions WHERE company_id=$1 ORDER BY created_at DESC', [req.currentUser!.companyId]); res.json({ data: result.rows.map((row) => ({ id: row.id, url: row.url, eventTypes: row.event_types, active: row.active, createdAt: row.created_at })) }); } catch (error) { next(error); } });
  router.post('/v1/webhooks', async (req, res, next) => { try { const input = z.object({ url: z.string().url().refine((raw) => { const url = new URL(raw); const localDev = config.nodeEnv === 'development' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname); return localDev || (url.protocol === 'https:' && config.webhookAllowedHosts.includes(url.hostname.toLowerCase())); }, 'El host debe estar en WEBHOOK_ALLOWED_HOSTS y usar HTTPS.'), eventTypes: z.array(z.enum(allowedEvents)).min(1) }).parse(req.body); const secret = `whsec_${randomBytes(32).toString('base64url')}`, derivedKey = createHash('sha256').update(secret).digest('hex'); const result = await pool.query('INSERT INTO webhook_subscriptions(company_id,url,secret_hash,event_types,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,url,event_types,active,created_at', [req.currentUser!.companyId, input.url, derivedKey, input.eventTypes, req.currentUser!.id]); await repository.appendAudit(req.currentUser!.companyId, req.currentUser!.id, 'webhook.created', 'webhook_subscription', result.rows[0].id, req.correlationId, { url: input.url, eventTypes: input.eventTypes }); res.status(201).json({ data: { id: result.rows[0].id, url: result.rows[0].url, eventTypes: result.rows[0].event_types, secret, warning: 'Guarda el secreto ahora; no volverá a mostrarse.' } }); } catch (error) { next(error); } });
  return router;
}
