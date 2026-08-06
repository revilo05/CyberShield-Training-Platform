export type RiskScoreInput = {
  failedSimulations?: number;
  completedModules?: number;
  totalModules?: number;
  repeatedMistakes?: number;
  reportedThreats?: number;
};

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RiskScoreResult = {
  score: number;
  level: RiskLevel;
  recommendations: string[];
};

export function calculateCyberRiskScore(input: RiskScoreInput): RiskScoreResult {
  const failedSimulations = input.failedSimulations ?? 0;
  const completedModules = input.completedModules ?? 0;
  const totalModules = Math.max(input.totalModules ?? 1, 1);
  const repeatedMistakes = input.repeatedMistakes ?? 0;
  const reportedThreats = input.reportedThreats ?? 0;

  const completionRate = completedModules / totalModules;
  const riskFromFailures = failedSimulations * 18;
  const riskFromRepeatedMistakes = repeatedMistakes * 12;
  const reductionFromProgress = completionRate * 25;
  const reductionFromReporting = reportedThreats * 5;

  const rawScore = 35 + riskFromFailures + riskFromRepeatedMistakes - reductionFromProgress - reductionFromReporting;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const level: RiskLevel = score >= 71 ? 'HIGH' : score >= 31 ? 'MEDIUM' : 'LOW';

  const recommendations = buildRecommendations(level, failedSimulations, completionRate);

  return { score, level, recommendations };
}

function buildRecommendations(level: RiskLevel, failedSimulations: number, completionRate: number): string[] {
  const recommendations: string[] = [];

  if (level === 'HIGH') {
    recommendations.push('Asignar ruta intensiva de phishing e ingeniería social.');
  }

  if (failedSimulations > 0) {
    recommendations.push('Repetir simulaciones con escenarios más cercanos al entorno laboral.');
  }

  if (completionRate < 0.75) {
    recommendations.push('Completar módulos pendientes antes de la próxima campaña.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Mantener entrenamiento preventivo mensual.');
  }

  return recommendations;
}
