import { store } from '../../data/seed-store.js';
import type { RiskScoreService } from '../risk-score/risk-score-v2.service.js';

export class ReportService {
  constructor(private readonly riskScoreService: RiskScoreService) {}

  progressReport() {
    return store.users.map((user) => {
      const progress = store.trainingProgress.filter((item) => item.userId === user.id);
      const completedModules = progress.filter((item) => item.status === 'COMPLETED').length;
      const score = this.riskScoreService.getForUser(user.id);
      return {
        user: { id: user.id, fullName: user.fullName, email: user.email, department: user.department, role: user.role },
        completedModules,
        totalModules: store.trainingModules.length,
        completionPercent: Math.round((completedModules / store.trainingModules.length) * 100),
        failedSimulations: score.factors.failedSimulations,
        riskScore: score.score,
        riskLevel: score.level,
        recommendations: score.recommendations
      };
    });
  }

  dashboard() {
    const report = this.progressReport();
    const averageRiskScore = Math.round(report.reduce((sum, row) => sum + row.riskScore, 0) / Math.max(report.length, 1));
    const moduleCompletionPercent = Math.round(report.reduce((sum, row) => sum + row.completionPercent, 0) / Math.max(report.length, 1));
    return {
      averageRiskScore,
      moduleCompletionPercent,
      failedSimulations: report.reduce((sum, row) => sum + row.failedSimulations, 0),
      reportedThreats: store.simulationResults.filter((result) => result.reportedThreat).length,
      highRiskUsers: [...report].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3),
      recommendations: [
        averageRiskScore > 50 ? 'Priorizar refuerzo de phishing para los usuarios de mayor riesgo.' : 'Mantener una campaña preventiva mensual.',
        moduleCompletionPercent < 75 ? 'Reservar tiempo de formación para elevar la finalización de módulos.' : 'Asignar simulaciones intermedias a quienes completaron su ruta.'
      ]
    };
  }
}
