import type { Simulation } from '../../core/models.js';

export type Evaluation = { wasSuccessful: boolean; reportedThreat: boolean; feedback: string };
interface SimulationEvaluationStrategy { evaluate(simulation: Simulation, optionId: string): Evaluation }

class PhishingEvaluationStrategy implements SimulationEvaluationStrategy {
  evaluate(simulation: Simulation, optionId: string): Evaluation {
    const option = simulation.options.find((candidate) => candidate.id === optionId);
    const wasSuccessful = optionId === simulation.correctOptionId;
    return { wasSuccessful, reportedThreat: wasSuccessful && option?.reportsThreat === true, feedback: wasSuccessful ? simulation.successFeedback : simulation.failureFeedback };
  }
}

class SocialEngineeringEvaluationStrategy implements SimulationEvaluationStrategy {
  evaluate(simulation: Simulation, optionId: string): Evaluation {
    const option = simulation.options.find((candidate) => candidate.id === optionId);
    const wasSuccessful = optionId === simulation.correctOptionId && option?.reportsThreat === true;
    return { wasSuccessful, reportedThreat: wasSuccessful, feedback: wasSuccessful ? simulation.successFeedback : simulation.failureFeedback };
  }
}

export class SimulationEvaluationStrategyProvider {
  static for(simulation: Simulation): SimulationEvaluationStrategy {
    return simulation.category === 'PHISHING' ? new PhishingEvaluationStrategy() : new SocialEngineeringEvaluationStrategy();
  }
}
