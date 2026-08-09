import { Router } from 'express';
import { authorize } from '../auth/authorization.strategy.js';
import type { ReportService } from './report.service.js';

export function createReportRouter(service: ReportService): Router {
  const router = Router();
  router.get('/progress', authorize('VIEW_REPORTS'), (_req, res) => res.json({ data: service.progressReport() }));
  return router;
}

export function createAdminRouter(service: ReportService): Router {
  const router = Router();
  router.get('/dashboard', authorize('VIEW_ADMIN_DASHBOARD'), (_req, res) => res.json({ data: service.dashboard() }));
  return router;
}
