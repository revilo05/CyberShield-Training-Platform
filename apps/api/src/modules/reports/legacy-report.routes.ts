import { Router } from 'express';
import type { AppConfig } from '../../config/env.js';
import type { PlatformRepository } from '../../core/enterprise-models.js';
import { createAuthentication, requireRoles } from '../auth/enterprise-auth.js';
import { EnterpriseRiskService } from '../risk-score/enterprise-risk.service.js';

export function createLegacyReportRouter(repository: PlatformRepository, config: AppConfig) {
  const router = Router(), risk = new EnterpriseRiskService(repository); router.use(createAuthentication(repository, config)); router.use(requireRoles('SUPERVISOR','ADMIN'));
  const rows = async (companyId: string) => Promise.all((await repository.listUsers(companyId)).map(async (user) => {
    const [snapshot, evidence, modules] = await Promise.all([risk.getOrCalculate(companyId, user.id), repository.getRiskEvidence(companyId, user.id), repository.listTrainingModules(companyId, user.id)]);
    const completedModules = evidence.modules.filter((item) => item.status === 'COMPLETED').length;
    return { user, completedModules, totalModules: modules.length, completionPercent: modules.length ? Math.round(completedModules / modules.length * 100) : 0, failedSimulations: evidence.simulationResults.filter((item) => !item.wasSuccessful).length, riskScore: snapshot.score, riskLevel: snapshot.level, recommendations: snapshot.recommendations, confidence: snapshot.confidence, confidenceLabel: snapshot.confidenceLabel };
  }));
  router.get('/reports/progress', async (_req, res, next) => { try { res.json({ data: await rows(_req.currentUser!.companyId) }); } catch (error) { next(error); } });
  router.get('/admin/dashboard', async (req, res, next) => { try { const report = await rows(req.currentUser!.companyId); const evidence = await Promise.all(report.map((row) => repository.getRiskEvidence(req.currentUser!.companyId, row.user.id))); res.json({ data: { averageRiskScore: report.length ? Math.round(report.reduce((sum, row) => sum + row.riskScore, 0) / report.length) : 0, moduleCompletionPercent: report.length ? Math.round(report.reduce((sum, row) => sum + row.completionPercent, 0) / report.length) : 0, failedSimulations: report.reduce((sum, row) => sum + row.failedSimulations, 0), reportedThreats: evidence.flatMap((item) => item.behaviorEvents).filter((item) => item.eventType === 'REPORTED').length, highRiskUsers: report.filter((row) => row.riskLevel === 'HIGH' && row.confidenceLabel !== 'LOW').slice(0, 5), recommendations: ['Priorizar cohortes con evidencia suficiente y tendencia ascendente.', 'Medir tasa de reporte y fallos por dificultad equivalente.'] } }); } catch (error) { next(error); } });
  return router;
}
