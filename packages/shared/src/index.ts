export type UserRole = 'EMPLOYEE' | 'SUPERVISOR' | 'ADMIN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CyberRiskScore = {
  userId: string;
  companyId: string;
  score: number;
  level: RiskLevel;
  updatedAt: string;
};

export type TrainingCategory = 'PHISHING' | 'PASSWORDS' | 'SOCIAL_ENGINEERING';
