import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../auth/authorization.strategy.js';
import type { SimulationService } from './simulation.service.js';

const answerSchema = z.object({ optionId: z.string().min(1) });

export function createSimulationRouter(service: SimulationService): Router {
  const router = Router();
  router.use(authorize('TRAIN'));
  router.get('/', (req, res) => res.json({ data: service.list(req.currentUser!.id) }));
  router.get('/results/me', (req, res) => res.json({ data: service.resultsFor(req.currentUser!.id) }));
  router.get('/:simulationId', (req, res) => res.json({ data: service.get(req.params.simulationId) }));
  router.post('/:simulationId/answers', (req, res) => {
    const parsed = answerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Selecciona una respuesta válida.', details: parsed.error.flatten() } });
      return;
    }
    res.status(201).json({ data: service.submit(req.currentUser!.id, req.params.simulationId, parsed.data.optionId) });
  });
  return router;
}
