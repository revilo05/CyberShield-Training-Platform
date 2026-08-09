import { randomUUID } from 'node:crypto';
import { EventBus } from '../../core/event-bus.js';
import { HttpError } from '../../core/http-error.js';
import { store } from '../../data/seed-store.js';
import { SimulationEvaluationStrategyProvider } from './simulation-evaluation.strategy.js';

export class SimulationService {
  constructor(private readonly eventBus: EventBus) {}

  list(userId: string) {
    return store.simulations.map((simulation) => ({
      ...this.toPublic(simulation),
      attempts: store.simulationResults.filter((result) => result.userId === userId && result.simulationId === simulation.id).length
    }));
  }

  get(simulationId: string) {
    const simulation = store.simulations.find((candidate) => candidate.id === simulationId);
    if (!simulation) throw new HttpError(404, 'Simulación no encontrada.');
    return this.toPublic(simulation);
  }

  submit(userId: string, simulationId: string, optionId: string) {
    const simulation = store.simulations.find((candidate) => candidate.id === simulationId);
    if (!simulation) throw new HttpError(404, 'Simulación no encontrada.');
    if (!simulation.options.some((option) => option.id === optionId)) throw new HttpError(400, 'La respuesta seleccionada no existe.');
    const evaluation = SimulationEvaluationStrategyProvider.for(simulation).evaluate(simulation, optionId);
    const result = { id: randomUUID(), userId, simulationId, selectedOptionId: optionId, ...evaluation, completedAt: new Date().toISOString() };
    store.simulationResults.push(result);
    this.eventBus.publish('simulation.completed', { userId, result });
    return result;
  }

  resultsFor(userId: string) {
    return store.simulationResults.filter((result) => result.userId === userId).map((result) => ({
      ...result,
      simulationTitle: store.simulations.find((simulation) => simulation.id === result.simulationId)?.title ?? result.simulationId
    }));
  }

  private toPublic(simulation: (typeof store.simulations)[number]) {
    const { correctOptionId: _correct, successFeedback: _success, failureFeedback: _failure, ...publicSimulation } = simulation;
    return publicSimulation;
  }
}
