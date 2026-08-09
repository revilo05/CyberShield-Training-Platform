export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type BehaviorEventType = 'DELIVERED' | 'BOUNCED' | 'CLICKED' | 'ATTEMPTED_ACTION' | 'REPORTED' | 'IGNORED';
export type RiskConfidenceLabel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ContentDraftStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED';

export type TenantContext = {
  companyId: string;
  userId: string;
  role: 'EMPLOYEE' | 'SUPERVISOR' | 'ADMIN';
  correlationId: string;
};

export type ScenarioVersion = {
  id: string;
  templateId: string;
  templateName: string;
  version: number;
  subject: string;
  senderName: string;
  senderAddress: string;
  channel: string;
  difficultyScore: number;
  observableCues: string[];
  premiseAlignment: 'LOW' | 'MEDIUM' | 'HIGH';
  audienceTags: string[];
  mitreTechniqueIds: string[];
  expectedBehavior: string;
};

export type Campaign = {
  id: string;
  companyId: string;
  name: string;
  scenarioVersionId: string;
  scenarioName?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  maxRecipients: number;
  targetCount: number;
  createdAt: string;
};

export type SimulationEvent = {
  eventType: BehaviorEventType;
  token: string;
  idempotencyKey: string;
  occurredAt?: string;
  responseTimeSeconds?: number;
};

export type RiskFactorContribution = {
  factor: 'SIMULATION_RESILIENCE' | 'REPORTING_READINESS' | 'LEARNING_MASTERY' | 'RECURRENCE';
  normalizedValue: number;
  weight: number;
  contribution: number;
  evidenceCount: number;
  explanation: string;
};

export type RiskSnapshot = {
  id: string;
  userId: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  confidenceLabel: RiskConfidenceLabel;
  exposureContext: string;
  scoreVersion: string;
  factors: RiskFactorContribution[];
  recommendations: string[];
  calculatedAt: string;
};

export type ContentDraft = {
  id: string;
  status: ContentDraftStatus;
  title: string;
  contentType: 'SCENARIO';
  payload: ScenarioDraftPayload;
  model?: string;
  promptVersion?: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
};

export type ScenarioDraftPayload = {
  title: string;
  category: string;
  channel: 'EMAIL' | 'CHAT' | 'VOICE' | 'WEB' | 'APP' | 'QR';
  subject: string;
  senderName: string;
  senderAddress: string;
  scenario: string;
  options: Array<{ id: string; label: string; isExpected: boolean }>;
  feedback: { success: string; failure: string };
  observableCues: string[];
  difficultyScore: number;
  premiseAlignment: 'LOW' | 'MEDIUM' | 'HIGH';
  audienceTags: string[];
  mitreTechniqueIds: string[];
  expectedBehavior: string;
  sourceUrls: string[];
};

export type IntegrationConnection = {
  provider: 'AUTH0' | 'MICROSOFT_GRAPH' | 'AWS_SES' | 'OPENAI';
  status: 'NOT_CONFIGURED' | 'CONFIGURED' | 'HEALTHY' | 'DEGRADED';
  scopes: string[];
  lastCheckedAt?: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorUserId?: string;
  correlationId?: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type OutboxEvent = {
  id: string;
  companyId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  attempts: number;
  availableAt: string;
};
