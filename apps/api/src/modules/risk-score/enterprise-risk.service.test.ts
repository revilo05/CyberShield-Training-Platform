import { describe, expect, it } from 'vitest';
import type { PlatformRepository, RiskEvidence } from '../../core/enterprise-models.js';
import { EnterpriseRiskService } from './enterprise-risk.service.js';

const now = new Date('2026-08-08T12:00:00.000Z');
const user = { id: 'user-1', companyId: 'company-1', fullName: 'Persona de prueba', email: 'test@example.com', role: 'EMPLOYEE' as const, department: 'Operaciones' };
const moduleAt = (progressPercent: number) => ({ userId: user.id, moduleId: `m-${progressPercent}-${Math.random()}`, moduleTitle: 'Módulo', status: progressPercent === 100 ? 'COMPLETED' as const : 'NOT_STARTED' as const, progressPercent, updatedAt: now.toISOString() });
const base = (): RiskEvidence => ({ user, modules: [moduleAt(100), moduleAt(100), moduleAt(0), moduleAt(0)], simulationResults: [], behaviorEvents: [], quizScores: [80] });
const service = new EnterpriseRiskService({} as PlatformRepository, () => now);

describe('HRS-2.0 golden tests', () => {
  it('mantiene la composición versionada sin evidencia conductual', () => {
    const snapshot = service.calculate(base());
    expect(snapshot.scoreVersion).toBe('HRS-2.0');
    expect(snapshot.score).toBe(32.9);
    expect(snapshot.confidence).toBe(56.3);
    expect(snapshot.factors.map((factor) => [factor.factor, factor.weight])).toEqual([
      ['SIMULATION_RESILIENCE', 0.4], ['REPORTING_READINESS', 0.25], ['LEARNING_MASTERY', 0.2], ['RECURRENCE', 0.15]
    ]);
  });

  it('penaliza más un fallo sencillo que uno difícil', () => {
    const evidence = base();
    const result = (difficultyScore: number) => service.calculate({ ...evidence, simulationResults: [{ id: 'r', userId: user.id, simulationId: 's', selectedOptionId: 'unsafe', wasSuccessful: false, reportedThreat: false, feedback: '', completedAt: now.toISOString(), difficultyScore }] }).score;
    expect(result(20)).toBeGreaterThan(result(80));
  });

  it('reduce el peso de evidencia antigua con vida media de 90 días', () => {
    const result = (oldFailure: boolean) => service.calculate({ ...base(), simulationResults: [
      { id: 'old', userId: user.id, simulationId: 's1', selectedOptionId: 'x', wasSuccessful: !oldFailure, reportedThreat: false, feedback: '', completedAt: '2026-02-09T12:00:00.000Z', difficultyScore: 50 },
      { id: 'new', userId: user.id, simulationId: 's2', selectedOptionId: 'x', wasSuccessful: oldFailure, reportedThreat: false, feedback: '', completedAt: now.toISOString(), difficultyScore: 50 }
    ] }).score;
    expect(result(true)).toBeLessThan(result(false));
  });
});
