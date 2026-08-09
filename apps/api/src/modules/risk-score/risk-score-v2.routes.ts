import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../auth/authorization.strategy.js';
import type { RiskScoreService } from './risk-score-v2.service.js';

const previewSchema = z.object({
  failedSimulations: z.number().int().nonnegative().optional(), completedModules: z.number().int().nonnegative().optional(),
  totalModules: z.number().int().positive().optional(), repeatedMistakes: z.number().int().nonnegative().optional(), reportedThreats: z.number().int().nonnegative().optional()
});

export function createRiskScoreRouter(service: RiskScoreService): Router {
  const router = Router();
  router.get('/me', authorize('VIEW_OWN_RISK'), (req, res) => res.json({ data: service.getForUser(req.currentUser!.id) }));
  router.post('/preview', authorize('VIEW_ADMIN_DASHBOARD'), (req, res) => {
    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: { message: 'Los factores no son válidos.', details: parsed.error.flatten() } }); return; }
    res.json({ data: service.preview(parsed.data) });
  });
  return router;
}
