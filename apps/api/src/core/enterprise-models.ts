import type { Campaign, ContentDraft, RiskSnapshot, ScenarioVersion } from '@cybershield/shared';
import type { Simulation, SimulationResult, TrainingModule, TrainingProgress, User } from './models.js';

export type EnterpriseTrainingModule = TrainingModule & {
  slug: string;
  version: number;
  learningObjectives: string[];
  audienceTags: string[];
  mitreTechniqueIds: string[];
  sources: Array<{ title: string; url: string }>;
  reviewDueAt?: string;
  progress: TrainingProgress;
};

export type EnterpriseSimulation = Simulation & {
  slug: string;
  channel: string;
  difficultyScore: number;
  observableCues: string[];
  premiseAlignment: 'LOW' | 'MEDIUM' | 'HIGH';
  audienceTags: string[];
  mitreTechniqueIds: string[];
  expectedBehavior: string;
  attempts?: number;
};

export type RiskEvidence = {
  user: User;
  modules: Array<TrainingProgress & { moduleTitle: string }>;
  simulationResults: Array<SimulationResult & { difficultyScore: number; completedAt: string }>;
  behaviorEvents: Array<{ eventType: string; difficultyScore: number; occurredAt: string; responseTimeSeconds?: number }>;
  quizScores: number[];
};

export type CampaignCreateInput = {
  name: string;
  scenarioVersionId: string;
  scheduledAt?: string;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  department?: string;
  excludedUserIds: string[];
  maxRecipients: number;
};

export type CampaignResults = {
  campaign: Campaign;
  delivered: number;
  bounced: number;
  clicked: number;
  attemptedAction: number;
  reported: number;
  ignored: number;
  reportingRate: number;
  failureRate: number;
};

export type PlatformRepository = {
  ping(): Promise<void>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(userId: string): Promise<User | null>;
  listUsers(companyId: string): Promise<User[]>;
  listTrainingModules(companyId: string, userId: string): Promise<EnterpriseTrainingModule[]>;
  getTrainingModule(companyId: string, userId: string, moduleId: string): Promise<EnterpriseTrainingModule | null>;
  updateTrainingProgress(companyId: string, userId: string, moduleId: string, status: TrainingProgress['status'], percent: number): Promise<TrainingProgress>;
  listProgress(companyId: string, userId: string): Promise<Array<TrainingProgress & { moduleTitle: string }>>;
  listSimulations(companyId: string, userId: string): Promise<EnterpriseSimulation[]>;
  getSimulation(companyId: string, simulationId: string): Promise<EnterpriseSimulation | null>;
  saveSimulationResult(companyId: string, result: SimulationResult): Promise<void>;
  listSimulationResults(companyId: string, userId: string): Promise<Array<SimulationResult & { simulationTitle: string }>>;
  getRiskEvidence(companyId: string, userId: string): Promise<RiskEvidence>;
  saveRiskSnapshot(companyId: string, snapshot: RiskSnapshot): Promise<RiskSnapshot>;
  getLatestRiskSnapshot(companyId: string, userId: string): Promise<RiskSnapshot | null>;
  getRiskHistory(companyId: string, userId: string, limit: number): Promise<RiskSnapshot[]>;
  listScenarioVersions(companyId: string): Promise<ScenarioVersion[]>;
  createCampaign(companyId: string, actorUserId: string, input: CampaignCreateInput): Promise<Campaign>;
  listCampaigns(companyId: string): Promise<Campaign[]>;
  getCampaign(companyId: string, campaignId: string): Promise<Campaign | null>;
  transitionCampaign(companyId: string, campaignId: string, status: Campaign['status'], actorUserId: string): Promise<Campaign>;
  getCampaignResults(companyId: string, campaignId: string): Promise<CampaignResults | null>;
  recordBehaviorEvent(tokenHash: string, eventType: string, idempotencyKey: string, occurredAt: string, responseTimeSeconds?: number): Promise<{ companyId: string; userId: string; campaignId: string } | null>;
  createContentDraft(companyId: string, draft: ContentDraft): Promise<ContentDraft>;
  listContentDrafts(companyId: string): Promise<ContentDraft[]>;
  reviewContentDraft(companyId: string, draftId: string, reviewerId: string, decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED', notes?: string): Promise<ContentDraft | null>;
  appendAudit(companyId: string, actorUserId: string | undefined, action: string, entityType: string, entityId: string | undefined, correlationId: string | undefined, details?: Record<string, unknown>): Promise<void>;
};
