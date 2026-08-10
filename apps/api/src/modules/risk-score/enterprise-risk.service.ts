import { randomUUID } from 'node:crypto';
import type { RiskFactorContribution, RiskSnapshot } from '@cybershield/shared';
import type { PlatformRepository, RiskEvidence } from '../../core/enterprise-models.js';

const SCORE_VERSION = 'HRS-2.0';
const HALF_LIFE_DAYS = 90;
const DAY_MS = 86_400_000;

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round = (value: number) => Math.round(value * 10) / 10;
const decay = (date: string, now: Date) => Math.pow(0.5, Math.max(0, now.getTime() - new Date(date).getTime()) / DAY_MS / HALF_LIFE_DAYS);
const level = (score: number): RiskSnapshot['level'] => score >= 67 ? 'HIGH' : score >= 34 ? 'MEDIUM' : 'LOW';

function weightedAverage(values: Array<{ value: number; weight: number }>, fallback: number): number {
  const total = values.reduce((sum, item) => sum + item.weight, 0);
  return total ? values.reduce((sum, item) => sum + item.value * item.weight, 0) / total : fallback;
}

export class EnterpriseRiskService {
  constructor(private readonly repository: PlatformRepository, private readonly clock: () => Date = () => new Date()) {}

  calculate(evidence: RiskEvidence): RiskSnapshot {
    const now = this.clock();
    const simulationSignals = evidence.simulationResults.map((result) => ({
      value: result.wasSuccessful ? 0 : clamp(125 - result.difficultyScore),
      weight: decay(result.completedAt, now)
    }));
    const campaignSignals = evidence.behaviorEvents.filter((event) => ['CLICKED', 'ATTEMPTED_ACTION'].includes(event.eventType)).map((event) => ({
      value: event.eventType === 'ATTEMPTED_ACTION' ? clamp(125 - event.difficultyScore) : clamp(90 - event.difficultyScore / 2),
      weight: decay(event.occurredAt, now)
    }));
    const simulationRisk = weightedAverage([...simulationSignals, ...campaignSignals], 35);

    const reportSignals = evidence.behaviorEvents.filter((event) => event.eventType === 'REPORTED').map((event) => ({
      value: clamp(100 - event.difficultyScore * 0.55 - Math.min(event.responseTimeSeconds ?? 900, 3600) / 72),
      weight: decay(event.occurredAt, now)
    }));
    const reportableCount = evidence.behaviorEvents.filter((event) => ['DELIVERED', 'CLICKED', 'ATTEMPTED_ACTION', 'REPORTED', 'IGNORED'].includes(event.eventType)).length;
    const reportingRisk = reportableCount ? clamp(weightedAverage(reportSignals, 100) * 0.55 + (1 - Math.min(reportSignals.length / reportableCount, 1)) * 45) : 45;

    const completed = evidence.modules.filter((module) => module.status === 'COMPLETED').length;
    const progressGap = evidence.modules.length ? 100 - evidence.modules.reduce((sum, module) => sum + module.progressPercent, 0) / evidence.modules.length : 50;
    const quizGap = evidence.quizScores.length ? 100 - evidence.quizScores.reduce((sum, value) => sum + value, 0) / evidence.quizScores.length : progressGap;
    const learningRisk = clamp(progressGap * 0.6 + quizGap * 0.4);

    const failures = [...simulationSignals, ...campaignSignals].filter((signal) => signal.value > 0);
    const recurrenceRisk = clamp(failures.length <= 1 ? failures.length * 20 : 35 + (failures.length - 1) * 15);
    const definitions: Array<[RiskFactorContribution['factor'], number, number, number, string]> = [
      ['SIMULATION_RESILIENCE', simulationRisk, 0.4, simulationSignals.length + campaignSignals.length, 'Respuestas ante simulaciones ajustadas por dificultad y antigüedad.'],
      ['REPORTING_READINESS', reportingRisk, 0.25, reportableCount, 'Frecuencia y velocidad de reporte; no utiliza aperturas de correo.'],
      ['LEARNING_MASTERY', learningRisk, 0.2, evidence.modules.length + evidence.quizScores.length, `${completed} módulos completados y dominio en evaluaciones.`],
      ['RECURRENCE', recurrenceRisk, 0.15, failures.length, 'Patrones de fallo repetido dentro de la ventana de evidencia.']
    ];
    const factors = definitions.map(([factor, normalizedValue, weight, evidenceCount, explanation]) => ({ factor, normalizedValue: round(normalizedValue), weight, contribution: round(normalizedValue * weight), evidenceCount, explanation }));
    const score = round(clamp(factors.reduce((sum, factor) => sum + factor.contribution, 0)));
    const evidenceCount = factors.reduce((sum, factor) => sum + factor.evidenceCount, 0);
    const evidenceDates = [...evidence.simulationResults.map((item) => item.completedAt), ...evidence.behaviorEvents.map((item) => item.occurredAt), ...evidence.modules.map((item) => item.updatedAt)].sort();
    const freshest = evidenceDates[evidenceDates.length - 1];
    const freshness = freshest ? decay(freshest, now) : 0;
    const confidence = round(clamp(Math.min(evidenceCount / 12, 1) * 75 + freshness * 25));
    const confidenceLabel = confidence >= 75 ? 'HIGH' : confidence >= 40 ? 'MEDIUM' : 'LOW';
    const exposureContext = ['Finanzas', 'Tecnología', 'TI', 'Administración'].includes(evidence.user.department) ? 'ELEVATED_ROLE_EXPOSURE' : 'STANDARD_ROLE_EXPOSURE';
    const recommendations = [
      ...(simulationRisk >= 45 ? ['Completar una microlección sobre señales observables antes del próximo escenario.'] : []),
      ...(reportingRisk >= 45 ? ['Practicar el canal de reporte y la actuación inmediata después de un clic.'] : []),
      ...(learningRisk >= 45 ? ['Completar el módulo pendiente de mayor prioridad y su evaluación posterior.'] : []),
      ...(recurrenceRisk >= 50 ? ['Asignar entrenamiento reforzado por reincidencia.'] : []),
      ...(score < 34 ? ['Mantener refuerzo trimestral con escenarios de dificultad progresiva.'] : [])
    ];
    return { id: randomUUID(), userId: evidence.user.id, score, level: level(score), confidence, confidenceLabel, exposureContext, scoreVersion: SCORE_VERSION, factors, recommendations, calculatedAt: now.toISOString() };
  }

  async calculateAndSave(companyId: string, userId: string): Promise<RiskSnapshot> {
    const snapshot = this.calculate(await this.repository.getRiskEvidence(companyId, userId));
    return this.repository.saveRiskSnapshot(companyId, snapshot);
  }

  async getOrCalculate(companyId: string, userId: string): Promise<RiskSnapshot> {
    return (await this.repository.getLatestRiskSnapshot(companyId, userId)) ?? this.calculateAndSave(companyId, userId);
  }
}
