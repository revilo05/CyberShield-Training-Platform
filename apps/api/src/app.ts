import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { EventBus } from './core/event-bus.js';
import { HttpError } from './core/http-error.js';
import { store } from './data/seed-store.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { requireAuthentication } from './modules/auth/auth.middleware.js';
import { createAdminRouter, createReportRouter } from './modules/reports/report.routes.js';
import { ReportService } from './modules/reports/report.service.js';
import { createRiskScoreRouter } from './modules/risk-score/risk-score-v2.routes.js';
import { RiskScoreService } from './modules/risk-score/risk-score-v2.service.js';
import { createSimulationRouter } from './modules/simulations/simulation.routes.js';
import { SimulationService } from './modules/simulations/simulation.service.js';
import { createTrainingRouter } from './modules/training/training.routes.js';
import { TrainingService } from './modules/training/training.service.js';

export function createApp() {
  const app = express();
  const eventBus = new EventBus();
  const riskScoreService = new RiskScoreService();
  const trainingService = new TrainingService(eventBus);
  const simulationService = new SimulationService(eventBus);
  const reportService = new ReportService(riskScoreService);

  eventBus.subscribe('training.completed', ({ userId }) => riskScoreService.calculateForUser(userId));
  eventBus.subscribe('simulation.completed', ({ userId }) => riskScoreService.calculateForUser(userId));
  store.users.forEach((user) => riskScoreService.calculateForUser(user.id));

  app.use(helmet());
  app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'cybershield-api', persistence: 'seed-memory' }));
  app.use('/api/auth', authRouter);
  app.use('/api/training', requireAuthentication, createTrainingRouter(trainingService));
  app.use('/api/simulations', requireAuthentication, createSimulationRouter(simulationService));
  app.use('/api/risk-score', requireAuthentication, createRiskScoreRouter(riskScoreService));
  app.use('/api/reports', requireAuthentication, createReportRouter(reportService));
  app.use('/api/admin', requireAuthentication, createAdminRouter(reportService));
  app.use((_req, res) => res.status(404).json({ error: { message: 'Ruta no encontrada.' } }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) { res.status(error.statusCode).json({ error: { message: error.message } }); return; }
    console.error(error);
    res.status(500).json({ error: { message: 'Ocurrió un error inesperado.' } });
  });
  return app;
}
