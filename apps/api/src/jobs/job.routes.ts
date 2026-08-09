import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { Pool } from 'pg';
import type { AppConfig } from '../config/env.js';
import { ServerlessJobRunner } from './serverless-job-runner.js';

function validCronSecret(header: string | undefined, expected: string | undefined): boolean {
  if (!header || !expected || !header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export function createJobRouter(pool: Pool, config: AppConfig) {
  const router = Router();
  router.all('/internal/cron/process-outbox', async (req, res, next) => {
    try {
      if (!validCronSecret(req.header('authorization'), config.jobs.cronSecret)) {
        res.status(401).json({ error: { message: 'Unauthorized cron invocation.' } });
        return;
      }
      const summary = await new ServerlessJobRunner(pool, config).run();
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
