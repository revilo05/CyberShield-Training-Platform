import type { TrainingCategory, TrainingModule } from '../../core/models.js';

type ModuleDraft = Omit<TrainingModule, 'category' | 'difficulty'> & {
  difficulty?: TrainingModule['difficulty'];
};

interface TrainingModuleFactory {
  create(draft: ModuleDraft): TrainingModule;
}

class BasicModuleFactory implements TrainingModuleFactory {
  constructor(private readonly category: TrainingCategory) {}

  create(draft: ModuleDraft): TrainingModule {
    return { ...draft, category: this.category, difficulty: draft.difficulty ?? 'BASIC' };
  }
}

class SocialEngineeringModuleFactory implements TrainingModuleFactory {
  create(draft: ModuleDraft): TrainingModule {
    return { ...draft, category: 'SOCIAL_ENGINEERING', difficulty: draft.difficulty ?? 'INTERMEDIATE' };
  }
}

export class TrainingModuleFactoryProvider {
  static for(category: TrainingCategory): TrainingModuleFactory {
    return category === 'SOCIAL_ENGINEERING'
      ? new SocialEngineeringModuleFactory()
      : new BasicModuleFactory(category);
  }
}
