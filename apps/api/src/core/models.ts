export type UserRole = 'EMPLOYEE' | 'SUPERVISOR' | 'ADMIN';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type TrainingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type TrainingCategory = 'PHISHING' | 'PASSWORDS' | 'SOCIAL_ENGINEERING';

export type User = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
};

export type TrainingLesson = { title: string; content: string };

export type TrainingModule = {
  id: string;
  title: string;
  category: TrainingCategory;
  estimatedMinutes: number;
  difficulty: 'BASIC' | 'INTERMEDIATE';
  description: string;
  lessons: TrainingLesson[];
};

export type TrainingProgress = {
  userId: string;
  moduleId: string;
  status: TrainingStatus;
  progressPercent: number;
  updatedAt: string;
  completedAt?: string;
};

export type SimulationOption = { id: string; label: string; reportsThreat?: boolean };

export type Simulation = {
  id: string;
  title: string;
  category: 'PHISHING' | 'SOCIAL_ENGINEERING';
  scenario: string;
  sender: string;
  subject: string;
  difficulty: 'BASIC' | 'INTERMEDIATE';
  options: SimulationOption[];
  correctOptionId: string;
  successFeedback: string;
  failureFeedback: string;
};

export type SimulationResult = {
  id: string;
  userId: string;
  simulationId: string;
  selectedOptionId: string;
  wasSuccessful: boolean;
  reportedThreat: boolean;
  feedback: string;
  completedAt: string;
};

export type RiskScore = {
  userId: string;
  score: number;
  level: RiskLevel;
  recommendations: string[];
  factors: {
    failedSimulations: number;
    completedModules: number;
    totalModules: number;
    repeatedMistakes: number;
    reportedThreats: number;
  };
  calculatedAt: string;
};
