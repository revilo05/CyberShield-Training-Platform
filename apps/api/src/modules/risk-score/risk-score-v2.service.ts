import type { RiskLevel, RiskScore } from '../../core/models.js';
import { HttpError } from '../../core/http-error.js';
import { store } from '../../data/seed-store.js';

export type RiskScoreInput = {
  failedSimulations?: number;
  completedModules?: number;
  totalModules?: number;
  repeatedMistakes?: number;
  reportedThreats?: number;
};

export type RiskScoreResult = { score: number; level: RiskLevel; recommendations: string[] };
export interface RiskScoreStrategy { calculate(input: RiskScoreInput): RiskScoreResult }

export class BehavioralRiskScoreStrategy implements RiskScoreStrategy {
  calculate(input: RiskScoreInput): RiskScoreResult {
    const failedSimulations = input.failedSimulations ?? 0;
    const completedModules = input.completedModules ?? 0;
    const totalModules = Math.max(input.totalModules ?? 1, 1);
    const repeatedMistakes = input.repeatedMistakes ?? 0;
    const reportedThreats = input.reportedThreats ?? 0;
    const completionRate = completedModules / totalModules;
    const rawScore = 40 + failedSimulations * 18 + repeatedMistakes * 12 - completionRate * 25 - reportedThreats * 5;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const level: RiskLevel = score >= 71 ? 'HIGH' : score >= 31 ? 'MEDIUM' : 'LOW';
    return { score, level, recommendations: this.recommend(level, failedSimulations, completionRate) };
  }

  private recommend(level: RiskLevel, failedSimulations: number, completionRate: number): string[] {
    const recommendations: string[] = [];
    if (level === 'HIGH') recommendations.push('Asignar una ruta intensiva de phishing e ingeniería social.');
    else if (level === 'MEDIUM') recommendations.push('Reforzar los escenarios donde se detectaron más errores.');
    if (failedSimulations > 0) recommendations.push('Repetir simulaciones con escenarios cercanos al entorno laboral.');
    if (completionRate < 0.75) recommendations.push('Completar los módulos pendientes antes de la próxima campaña.');
    if (recommendations.length === 0) recommendations.push('Mantener entrenamiento preventivo mensual.');
    return recommendations;
  }
}

export class RiskScoreService {
  constructor(private readonly strategy: RiskScoreStrategy = new BehavioralRiskScoreStrategy()) {}

  preview(input: RiskScoreInput) { return this.strategy.calculate(input); }

  calculateForUser(userId: string): RiskScore {
    if (!store.users.some((user) => user.id === userId)) throw new HttpError(404, 'Usuario no encontrado.');
    const progress = store.trainingProgress.filter((item) => item.userId === userId);
    const results = store.simulationResults.filter((item) => item.userId === userId);
    const failures = new Map<string, number>();
    for (const result of results.filter((item) => !item.wasSuccessful)) failures.set(result.simulationId, (failures.get(result.simulationId) ?? 0) + 1);
    const factors = {
      failedSimulations: results.filter((item) => !item.wasSuccessful).length,
      completedModules: progress.filter((item) => item.status === 'COMPLETED').length,
      totalModules: store.trainingModules.length,
      repeatedMistakes: [...failures.values()].reduce((sum, attempts) => sum + Math.max(0, attempts - 1), 0),
      reportedThreats: results.filter((item) => item.reportedThreat).length
    };
    const riskScore: RiskScore = { userId, ...this.strategy.calculate(factors), factors, calculatedAt: new Date().toISOString() };
    const previous = store.riskScores.find((item) => item.userId === userId);
    if (previous) Object.assign(previous, riskScore); else store.riskScores.push(riskScore);
    return riskScore;
  }

  getForUser(userId: string): RiskScore {
    return store.riskScores.find((item) => item.userId === userId) ?? this.calculateForUser(userId);
  }
}
