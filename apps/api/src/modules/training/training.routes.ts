import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../auth/authorization.strategy.js';
import type { TrainingService } from './training.service.js';

const progressSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  progressPercent: z.number().int().min(0).max(100).optional()
});

export function createTrainingRouter(service: TrainingService): Router {
  const router = Router();
  router.use(authorize('TRAIN'));
  router.get('/modules', (req, res) => res.json({ data: service.listForUser(req.currentUser!.id) }));
  router.get('/modules/:moduleId', (req, res) => res.json({ data: service.getForUser(req.currentUser!.id, req.params.moduleId) }));
  router.get('/progress/me', (req, res) => res.json({ data: service.listProgress(req.currentUser!.id) }));
  router.patch('/progress/:moduleId', (req, res) => {
    const parsed = progressSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'El estado o porcentaje no es válido.', details: parsed.error.flatten() } });
      return;
    }
    res.json({ data: service.updateProgress(req.currentUser!.id, req.params.moduleId, parsed.data.status, parsed.data.progressPercent) });
  });
  return router;
}
