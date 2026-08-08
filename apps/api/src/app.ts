import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { Pool } from 'pg';
import { ZodError } from 'zod';
import { loadConfig, type AppConfig } from './config/env.js';
import { HttpError } from './core/http-error.js';
import { createPool } from './database/pool.js';
import { runMigrations } from './database/migrate.js';
import { createEnterpriseAuthRouter } from './modules/auth/enterprise-auth.routes.js';
import { createExportRouter } from './modules/exports/export.routes.js';
import { createLegacyReportRouter } from './modules/reports/legacy-report.routes.js';
import { createPlatformRouter } from './modules/platform/platform.routes.js';
import { PostgresPlatformRepository } from './repositories/postgres-platform.repository.js';
import { httpLogger } from './observability/http-logger.js';
import { createWebhookRouter } from './modules/webhooks/webhook.routes.js';

export type AppRuntime = { app: express.Express; pool: Pool; config: AppConfig };
export async function createApp(overrides: { config?: AppConfig; pool?: Pool } = {}): Promise<AppRuntime> {
  const config = overrides.config ?? loadConfig(); const pool = overrides.pool ?? createPool(config);
  if (config.autoMigrate) await runMigrations(pool);
  const repository = new PostgresPlatformRepository(pool); await repository.ping();
  const app = express(); app.disable('x-powered-by');
  app.use(httpLogger); app.use(helmet()); app.use(cors({ origin: config.webOrigin, credentials: true })); app.use(express.json({ limit: '256kb' }));
  app.get('/health', async (_req, res, next) => { try { await repository.ping(); res.json({ status: 'ok', service: 'cybershield-api', persistence: 'postgresql', scoreVersion: 'HRS-2.0' }); } catch (error) { next(error); } });
  app.use('/api/auth', createEnterpriseAuthRouter(repository, config)); app.use('/api', createPlatformRouter(repository, config)); app.use('/api', createLegacyReportRouter(repository, config)); app.use('/api', createWebhookRouter(pool, repository, config)); app.use('/api', createExportRouter(pool, repository, config));
  app.use((_req, res) => res.status(404).json({ error: { message: 'Ruta no encontrada.' } }));
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => { const correlationId = req.correlationId ?? req.header('x-correlation-id'); if (error instanceof HttpError) { res.status(error.statusCode).json({ error: { message: error.message, correlationId } }); return; } if (error instanceof ZodError) { res.status(400).json({ error: { message: 'La solicitud contiene datos inválidos.', details: error.flatten(), correlationId } }); return; } console.error({ error, correlationId }); const detail = error instanceof Error ? error.message : String(error); res.status(500).json({ error: { message: config.nodeEnv === 'development' ? detail : 'Ocurrió un error inesperado.', correlationId } }); });
  return { app, pool, config };
}
