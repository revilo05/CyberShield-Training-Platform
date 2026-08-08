export type UserRole = 'EMPLOYEE' | 'SUPERVISOR' | 'ADMIN';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RouteName = 'dashboard' | 'modules' | 'module-detail' | 'simulations' | 'reports' | 'profile';

export type User = { id: string; companyId?: string; fullName: string; email: string; role: UserRole; department: string };
export type TrainingProgress = { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; progressPercent: number };
export type TrainingModule = {
  id: string; title: string; category: string; estimatedMinutes: number; difficulty: string; description: string;
  lessons: Array<{ title: string; content: string }>;
  progress: TrainingProgress;
};
export type Simulation = {
  id: string; title: string; category: string; scenario: string; sender: string; subject: string; difficulty: string;
  options: Array<{ id: string; label: string }>; attempts?: number;
};
export type SimulationResult = { wasSuccessful: boolean; feedback: string; reportedThreat: boolean };
export type RiskScore = {
  score: number; level: RiskLevel; recommendations: string[]; calculatedAt: string;
  factors: { failedSimulations: number; completedModules: number; totalModules: number; repeatedMistakes: number; reportedThreats: number };
};
export type ReportRow = {
  user: User; completedModules: number; totalModules: number; completionPercent: number; failedSimulations: number;
  riskScore: number; riskLevel: RiskLevel; recommendations: string[];
};
export type AdminDashboard = {
  averageRiskScore: number; moduleCompletionPercent: number; failedSimulations: number; reportedThreats: number;
  highRiskUsers: ReportRow[]; recommendations: string[];
};
