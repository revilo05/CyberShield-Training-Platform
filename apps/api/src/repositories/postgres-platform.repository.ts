import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { Campaign, ContentDraft, RiskFactorContribution, RiskSnapshot, ScenarioVersion } from '@cybershield/shared';
import type { SimulationResult, TrainingProgress, User } from '../core/models.js';
import type { CampaignCreateInput, CampaignResults, EnterpriseSimulation, EnterpriseTrainingModule, PlatformRepository, RiskEvidence } from '../core/enterprise-models.js';

function json<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function mapUser(row: QueryResultRow): User {
  return { id: row.id, companyId: row.company_id, fullName: row.full_name, email: row.email, role: row.role, department: row.department ?? 'Sin departamento' };
}

function mapProgress(row: QueryResultRow): TrainingProgress {
  return {
    userId: row.user_id,
    moduleId: row.module_id,
    status: row.status ?? 'NOT_STARTED',
    progressPercent: Number(row.progress_percent ?? 0),
    updatedAt: toIso(row.updated_at ?? new Date(0)),
    ...(row.completed_at ? { completedAt: toIso(row.completed_at) } : {})
  };
}

function mapModule(row: QueryResultRow): EnterpriseTrainingModule {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    estimatedMinutes: Number(row.estimated_minutes),
    difficulty: row.difficulty,
    description: row.description ?? '',
    lessons: json(row.lessons, []),
    slug: row.slug ?? row.id,
    version: Number(row.version ?? 1),
    learningObjectives: json(row.learning_objectives, []),
    audienceTags: row.audience_tags ?? [],
    mitreTechniqueIds: row.mitre_technique_ids ?? [],
    sources: json(row.sources, []),
    ...(row.review_due_at ? { reviewDueAt: toIso(row.review_due_at) } : {}),
    progress: mapProgress({ ...row, user_id: row.progress_user_id ?? row.user_id, module_id: row.id })
  };
}

function mapSimulation(row: QueryResultRow): EnterpriseSimulation {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    scenario: row.scenario,
    sender: row.sender ?? '',
    subject: row.subject ?? row.title,
    difficulty: row.difficulty,
    options: json(row.options, []),
    correctOptionId: row.correct_option_id,
    successFeedback: row.success_feedback ?? 'Respuesta segura.',
    failureFeedback: row.failure_feedback ?? 'Revisa las señales antes de actuar.',
    slug: row.slug ?? row.id,
    channel: row.channel ?? 'EMAIL',
    difficultyScore: Number(row.difficulty_score ?? 50),
    observableCues: json(row.observable_cues, []),
    premiseAlignment: row.premise_alignment ?? 'MEDIUM',
    audienceTags: row.audience_tags ?? [],
    mitreTechniqueIds: row.mitre_technique_ids ?? [],
    expectedBehavior: row.expected_behavior ?? 'Reportar y verificar',
    attempts: Number(row.attempts ?? 0)
  };
}

function mapCampaign(row: QueryResultRow): Campaign {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    scenarioVersionId: row.scenario_version_id,
    scenarioName: row.scenario_name,
    status: row.status,
    ...(row.scheduled_at ? { scheduledAt: toIso(row.scheduled_at) } : {}),
    ...(row.send_window_start ? { sendWindowStart: String(row.send_window_start) } : {}),
    ...(row.send_window_end ? { sendWindowEnd: String(row.send_window_end) } : {}),
    maxRecipients: Number(row.max_recipients),
    targetCount: Number(row.target_count ?? 0),
    createdAt: toIso(row.created_at)
  };
}

function mapDraft(row: QueryResultRow): ContentDraft {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    contentType: row.content_type,
    payload: json<ContentDraft['payload']>(row.payload, {} as ContentDraft['payload']),
    model: row.model ?? undefined,
    promptVersion: row.prompt_version ?? undefined,
    requestedBy: row.requested_by,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ? toIso(row.approved_at) : undefined,
    createdAt: toIso(row.created_at)
  };
}

export class PostgresPlatformRepository implements PlatformRepository {
  constructor(private readonly pool: Pool) {}

  async ping(): Promise<void> { await this.pool.query('SELECT 1'); }

  private async withTenant<T>(companyId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1) AND active=TRUE LIMIT 1', [email]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findUserById(userId: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id=$1 AND active=TRUE LIMIT 1', [userId]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async listUsers(companyId: string): Promise<User[]> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query('SELECT * FROM users WHERE company_id=$1 AND active=TRUE ORDER BY full_name', [companyId]);
      return result.rows.map(mapUser);
    });
  }

  async listTrainingModules(companyId: string, userId: string): Promise<EnterpriseTrainingModule[]> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`SELECT m.*, p.user_id AS progress_user_id, p.status, p.progress_percent, p.updated_at, p.completed_at
        FROM training_modules m LEFT JOIN training_progress p ON p.module_id=m.id AND p.user_id=$2
        WHERE m.company_id IS NULL OR m.company_id=$1 ORDER BY m.estimated_minutes, m.title`, [companyId, userId]);
      return result.rows.map(mapModule);
    });
  }

  async getTrainingModule(companyId: string, userId: string, moduleId: string): Promise<EnterpriseTrainingModule | null> {
    const modules = await this.listTrainingModules(companyId, userId);
    return modules.find((module) => module.id === moduleId) ?? null;
  }

  async updateTrainingProgress(companyId: string, userId: string, moduleId: string, status: TrainingProgress['status'], percent: number): Promise<TrainingProgress> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`INSERT INTO training_progress(user_id,module_id,status,progress_percent,completed_at,updated_at)
        SELECT $1,$2,$3,$4,CASE WHEN $3='COMPLETED' THEN NOW() ELSE NULL END,NOW()
        FROM users u WHERE u.id=$1 AND u.company_id=$5
        ON CONFLICT(user_id,module_id) DO UPDATE SET status=EXCLUDED.status,progress_percent=EXCLUDED.progress_percent,
          completed_at=CASE WHEN EXCLUDED.status='COMPLETED' THEN COALESCE(training_progress.completed_at,NOW()) ELSE NULL END,updated_at=NOW()
        RETURNING *`, [userId, moduleId, status, percent, companyId]);
      if (!result.rows[0]) throw new Error('No se pudo actualizar el progreso para el tenant actual.');
      return mapProgress(result.rows[0]);
    });
  }

  async listProgress(companyId: string, userId: string): Promise<Array<TrainingProgress & { moduleTitle: string }>> {
    const modules = await this.listTrainingModules(companyId, userId);
    return modules.map((module) => ({ ...module.progress, moduleTitle: module.title }));
  }

  async listSimulations(companyId: string, userId: string): Promise<EnterpriseSimulation[]> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`SELECT s.*,COUNT(r.id)::int AS attempts FROM simulations s
        LEFT JOIN simulation_results r ON r.simulation_id=s.id AND r.user_id=$2
        WHERE s.company_id IS NULL OR s.company_id=$1 GROUP BY s.id ORDER BY s.difficulty_score,s.title`, [companyId, userId]);
      return result.rows.map(mapSimulation);
    });
  }

  async getSimulation(companyId: string, simulationId: string): Promise<EnterpriseSimulation | null> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query('SELECT * FROM simulations WHERE id=$2 AND (company_id IS NULL OR company_id=$1)', [companyId, simulationId]);
      return result.rows[0] ? mapSimulation(result.rows[0]) : null;
    });
  }

  async saveSimulationResult(companyId: string, result: SimulationResult): Promise<void> {
    await this.withTenant(companyId, async (client) => {
      await client.query(`INSERT INTO simulation_results(id,user_id,simulation_id,was_successful,risk_points,selected_option_id,reported_threat,feedback,completed_at)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9 FROM users u WHERE u.id=$2 AND u.company_id=$10`,
      [result.id, result.userId, result.simulationId, result.wasSuccessful, result.wasSuccessful ? 0 : 18, result.selectedOptionId, result.reportedThreat, result.feedback, result.completedAt, companyId]);
    });
  }

  async listSimulationResults(companyId: string, userId: string): Promise<Array<SimulationResult & { simulationTitle: string }>> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`SELECT r.*,s.title AS simulation_title FROM simulation_results r JOIN simulations s ON s.id=r.simulation_id
        JOIN users u ON u.id=r.user_id WHERE r.user_id=$2 AND u.company_id=$1 ORDER BY r.completed_at DESC`, [companyId, userId]);
      return result.rows.map((row) => ({ id: row.id, userId: row.user_id, simulationId: row.simulation_id, selectedOptionId: row.selected_option_id ?? '', wasSuccessful: row.was_successful, reportedThreat: row.reported_threat, feedback: row.feedback ?? '', completedAt: toIso(row.completed_at), simulationTitle: row.simulation_title }));
    });
  }

  async getRiskEvidence(companyId: string, userId: string): Promise<RiskEvidence> {
    const user = await this.findUserById(userId);
    if (!user || user.companyId !== companyId) throw new Error('Usuario no encontrado en el tenant.');
    return this.withTenant(companyId, async (client) => {
      const [modules, simulations, behavior, quizzes] = await Promise.all([
        client.query(`SELECT p.*,m.title AS module_title FROM training_progress p JOIN training_modules m ON m.id=p.module_id WHERE p.user_id=$1`, [userId]),
        client.query(`SELECT r.*,s.difficulty_score FROM simulation_results r JOIN simulations s ON s.id=r.simulation_id WHERE r.user_id=$1`, [userId]),
        client.query(`SELECT e.*,COALESCE(v.difficulty_score,50) AS difficulty_score FROM behavior_events e LEFT JOIN scenario_versions v ON v.id=e.scenario_version_id WHERE e.user_id=$1`, [userId]),
        client.query('SELECT score FROM quiz_attempts WHERE user_id=$1 ORDER BY completed_at DESC', [userId])
      ]);
      return {
        user,
        modules: modules.rows.map((row) => ({ ...mapProgress(row), moduleTitle: row.module_title })),
        simulationResults: simulations.rows.map((row) => ({ id: row.id, userId: row.user_id, simulationId: row.simulation_id, selectedOptionId: row.selected_option_id ?? '', wasSuccessful: row.was_successful, reportedThreat: row.reported_threat, feedback: row.feedback ?? '', completedAt: toIso(row.completed_at), difficultyScore: Number(row.difficulty_score) })),
        behaviorEvents: behavior.rows.map((row) => ({ eventType: row.event_type, difficultyScore: Number(row.difficulty_score), occurredAt: toIso(row.occurred_at), responseTimeSeconds: row.response_time_seconds ?? undefined })),
        quizScores: quizzes.rows.map((row) => Number(row.score))
      };
    });
  }

  async saveRiskSnapshot(companyId: string, snapshot: RiskSnapshot): Promise<RiskSnapshot> {
    return this.withTenant(companyId, async (client) => {
      await client.query(`INSERT INTO risk_score_snapshots(id,company_id,user_id,score,level,confidence,confidence_label,exposure_context,score_version,recommendations,calculated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [snapshot.id, companyId, snapshot.userId, snapshot.score, snapshot.level, snapshot.confidence, snapshot.confidenceLabel, snapshot.exposureContext, snapshot.scoreVersion, JSON.stringify(snapshot.recommendations), snapshot.calculatedAt]);
      for (const factor of snapshot.factors) {
        await client.query(`INSERT INTO risk_score_factors(snapshot_id,factor,normalized_value,weight,contribution,evidence_count,explanation)
          VALUES($1,$2,$3,$4,$5,$6,$7)`, [snapshot.id, factor.factor, factor.normalizedValue, factor.weight, factor.contribution, factor.evidenceCount, factor.explanation]);
      }
      await client.query(`INSERT INTO risk_scores(user_id,score,level,recommendations,calculated_at) VALUES($1,$2,$3,$4,$5)`, [snapshot.userId, Math.round(snapshot.score), snapshot.level, JSON.stringify(snapshot.recommendations), snapshot.calculatedAt]);
      await client.query(`INSERT INTO outbox_events(company_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,'risk.changed','USER',$2,$3)`,
        [companyId, snapshot.userId, JSON.stringify({ userId: snapshot.userId, score: snapshot.score, level: snapshot.level, confidence: snapshot.confidence, scoreVersion: snapshot.scoreVersion })]);
      return snapshot;
    });
  }

  private async factorsFor(client: PoolClient, snapshotId: string): Promise<RiskFactorContribution[]> {
    const result = await client.query('SELECT * FROM risk_score_factors WHERE snapshot_id=$1 ORDER BY factor', [snapshotId]);
    return result.rows.map((row) => ({ factor: row.factor, normalizedValue: Number(row.normalized_value), weight: Number(row.weight), contribution: Number(row.contribution), evidenceCount: Number(row.evidence_count), explanation: row.explanation }));
  }

  private async mapSnapshot(client: PoolClient, row: QueryResultRow): Promise<RiskSnapshot> {
    return { id: row.id, userId: row.user_id, score: Number(row.score), level: row.level, confidence: Number(row.confidence), confidenceLabel: row.confidence_label, exposureContext: row.exposure_context, scoreVersion: row.score_version, recommendations: json(row.recommendations, []), factors: await this.factorsFor(client, row.id), calculatedAt: toIso(row.calculated_at) };
  }

  async getLatestRiskSnapshot(companyId: string, userId: string): Promise<RiskSnapshot | null> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query('SELECT * FROM risk_score_snapshots WHERE company_id=$1 AND user_id=$2 ORDER BY calculated_at DESC LIMIT 1', [companyId, userId]);
      return result.rows[0] ? this.mapSnapshot(client, result.rows[0]) : null;
    });
  }

  async getRiskHistory(companyId: string, userId: string, limit: number): Promise<RiskSnapshot[]> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query('SELECT * FROM risk_score_snapshots WHERE company_id=$1 AND user_id=$2 ORDER BY calculated_at DESC LIMIT $3', [companyId, userId, limit]);
      return Promise.all(result.rows.map((row) => this.mapSnapshot(client, row)));
    });
  }

  async listScenarioVersions(companyId: string): Promise<ScenarioVersion[]> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`SELECT v.*,t.name AS template_name,t.channel FROM scenario_versions v JOIN scenario_templates t ON t.id=v.template_id
        WHERE t.status='PUBLISHED' AND (t.company_id IS NULL OR t.company_id=$1) ORDER BY t.name`, [companyId]);
      return result.rows.map((row) => ({ id: row.id, templateId: row.template_id, templateName: row.template_name, version: Number(row.version), subject: row.subject, senderName: row.sender_name, senderAddress: row.sender_address, channel: row.channel, difficultyScore: Number(row.difficulty_score), observableCues: json(row.observable_cues, []), premiseAlignment: row.premise_alignment, audienceTags: row.audience_tags ?? [], mitreTechniqueIds: row.mitre_technique_ids ?? [], expectedBehavior: row.expected_behavior }));
    });
  }

  async createCampaign(companyId: string, actorUserId: string, input: CampaignCreateInput): Promise<Campaign> {
    return this.withTenant(companyId, async (client) => {
      const created = await client.query(`INSERT INTO campaigns(company_id,name,scenario_version_id,status,scheduled_at,send_window_start,send_window_end,excluded_user_ids,max_recipients,created_by)
        VALUES($1,$2,$3,'DRAFT',$4,$5,$6,$7,$8,$9) RETURNING *`, [companyId, input.name, input.scenarioVersionId, input.scheduledAt ?? null, input.sendWindowStart ?? null, input.sendWindowEnd ?? null, input.excludedUserIds, input.maxRecipients, actorUserId]);
      const campaignId = created.rows[0].id;
      await client.query(`INSERT INTO campaign_targets(campaign_id,company_id,user_id)
        SELECT $1,$2,u.id FROM users u WHERE u.company_id=$2 AND u.active=TRUE AND u.role='EMPLOYEE'
          AND ($3::text IS NULL OR u.department=$3) AND NOT (u.id=ANY($4::uuid[])) ORDER BY u.created_at LIMIT $5
        ON CONFLICT DO NOTHING`, [campaignId, companyId, input.department ?? null, input.excludedUserIds, input.maxRecipients]);
      const count = await client.query('SELECT COUNT(*)::int AS count FROM campaign_targets WHERE campaign_id=$1', [campaignId]);
      return mapCampaign({ ...created.rows[0], target_count: count.rows[0].count });
    });
  }

  async listCampaigns(companyId: string): Promise<Campaign[]> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`SELECT c.*,t.name AS scenario_name,COUNT(ct.id)::int AS target_count FROM campaigns c
        JOIN scenario_versions v ON v.id=c.scenario_version_id JOIN scenario_templates t ON t.id=v.template_id
        LEFT JOIN campaign_targets ct ON ct.campaign_id=c.id WHERE c.company_id=$1 GROUP BY c.id,t.name ORDER BY c.created_at DESC`, [companyId]);
      return result.rows.map(mapCampaign);
    });
  }

  async getCampaign(companyId: string, campaignId: string): Promise<Campaign | null> {
    const campaigns = await this.listCampaigns(companyId);
    return campaigns.find((campaign) => campaign.id === campaignId) ?? null;
  }

  async transitionCampaign(companyId: string, campaignId: string, status: Campaign['status'], actorUserId: string): Promise<Campaign> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`UPDATE campaigns SET status=$3::varchar,updated_at=NOW(),approved_by=CASE WHEN $3::varchar='SCHEDULED' THEN $4::uuid ELSE approved_by END,
        approved_at=CASE WHEN $3::varchar='SCHEDULED' THEN NOW() ELSE approved_at END WHERE company_id=$1 AND id=$2 RETURNING *`, [companyId, campaignId, status, actorUserId]);
      if (!result.rows[0]) throw new Error('Campaña no encontrada.');
      if (status === 'SCHEDULED') {
        await client.query(`INSERT INTO outbox_events(company_id,event_type,aggregate_type,aggregate_id,payload,available_at)
          VALUES($1,'CAMPAIGN.SCHEDULED','CAMPAIGN',$2,$3,COALESCE($4,NOW()))`, [companyId, campaignId, JSON.stringify({ campaignId, companyId }), result.rows[0].scheduled_at]);
      }
      const count = await client.query('SELECT COUNT(*)::int AS count FROM campaign_targets WHERE campaign_id=$1', [campaignId]);
      return mapCampaign({ ...result.rows[0], target_count: count.rows[0].count });
    });
  }

  async getCampaignResults(companyId: string, campaignId: string): Promise<CampaignResults | null> {
    const campaign = await this.getCampaign(companyId, campaignId);
    if (!campaign) return null;
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`SELECT event_type,COUNT(*)::int AS count FROM behavior_events WHERE company_id=$1 AND campaign_id=$2 GROUP BY event_type`, [companyId, campaignId]);
      const counts = Object.fromEntries(result.rows.map((row) => [row.event_type, Number(row.count)]));
      const delivered = counts.DELIVERED ?? 0, clicked = counts.CLICKED ?? 0, attemptedAction = counts.ATTEMPTED_ACTION ?? 0, reported = counts.REPORTED ?? 0;
      return { campaign, delivered, bounced: counts.BOUNCED ?? 0, clicked, attemptedAction, reported, ignored: counts.IGNORED ?? 0, reportingRate: delivered ? Math.round(reported / delivered * 100) : 0, failureRate: delivered ? Math.round((clicked + attemptedAction) / delivered * 100) : 0 };
    });
  }

  async recordBehaviorEvent(tokenHash: string, eventType: string, idempotencyKey: string, occurredAt: string, responseTimeSeconds?: number): Promise<{ companyId: string; userId: string; campaignId: string } | null> {
    const target = await this.pool.query(`UPDATE campaign_targets ct SET token_hash=NULL,token_consumed_at=NOW() FROM campaigns c
      WHERE ct.campaign_id=c.id AND ct.token_hash=$1 AND ct.token_expires_at>NOW() AND ct.token_consumed_at IS NULL AND c.status IN ('RUNNING','SCHEDULED')
      RETURNING ct.*,c.scenario_version_id`, [tokenHash]);
    if (!target.rows[0]) return null;
    const row = target.rows[0];
    return this.withTenant(row.company_id, async (client) => {
      const inserted = await client.query(`INSERT INTO behavior_events(company_id,user_id,campaign_id,scenario_version_id,event_type,idempotency_key,occurred_at,response_time_seconds)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(company_id,idempotency_key) DO NOTHING RETURNING id`, [row.company_id, row.user_id, row.campaign_id, row.scenario_version_id, eventType, idempotencyKey, occurredAt, responseTimeSeconds ?? null]);
      if (!inserted.rowCount) return null;
      await client.query('UPDATE campaign_targets SET target_status=$2 WHERE id=$1', [row.id, eventType]);
      if (eventType === 'REPORTED') await client.query(`INSERT INTO outbox_events(company_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,'simulation.reported','CAMPAIGN',$2,$3)`,
        [row.company_id, row.campaign_id, JSON.stringify({ campaignId: row.campaign_id, userId: row.user_id, occurredAt })]);
      return { companyId: row.company_id, userId: row.user_id, campaignId: row.campaign_id };
    });
  }

  async createContentDraft(companyId: string, draft: ContentDraft): Promise<ContentDraft> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query(`INSERT INTO content_drafts(id,company_id,status,title,content_type,payload,model,prompt_version,requested_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [draft.id, companyId, draft.status, draft.title, draft.contentType, JSON.stringify(draft.payload), draft.model ?? null, draft.promptVersion ?? null, draft.requestedBy, draft.createdAt]);
      return mapDraft(result.rows[0]);
    });
  }

  async listContentDrafts(companyId: string): Promise<ContentDraft[]> {
    return this.withTenant(companyId, async (client) => {
      const result = await client.query('SELECT * FROM content_drafts WHERE company_id=$1 ORDER BY created_at DESC', [companyId]);
      return result.rows.map(mapDraft);
    });
  }

  async reviewContentDraft(companyId: string, draftId: string, reviewerId: string, decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED', notes?: string): Promise<ContentDraft | null> {
    return this.withTenant(companyId, async (client) => {
      await client.query('INSERT INTO content_reviews(draft_id,reviewer_id,decision,notes) SELECT id,$2,$3,$4 FROM content_drafts WHERE id=$1 AND company_id=$5', [draftId, reviewerId, decision, notes ?? null, companyId]);
      const status = decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'REVIEW';
      const result = await client.query(`UPDATE content_drafts SET status=$3,approved_by=CASE WHEN $3='APPROVED' THEN $4 ELSE NULL END,
        approved_at=CASE WHEN $3='APPROVED' THEN NOW() ELSE NULL END WHERE id=$2 AND company_id=$1 RETURNING *`, [companyId, draftId, status, reviewerId]);
      return result.rows[0] ? mapDraft(result.rows[0]) : null;
    });
  }

  async appendAudit(companyId: string, actorUserId: string | undefined, action: string, entityType: string, entityId: string | undefined, correlationId: string | undefined, details: Record<string, unknown> = {}): Promise<void> {
    await this.withTenant(companyId, async (client) => {
      await client.query(`INSERT INTO audit_logs(company_id,actor_user_id,action,entity_type,entity_id,correlation_id,details)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [companyId, actorUserId ?? null, action, entityType, entityId ?? null, correlationId ?? null, JSON.stringify(details)]);
    });
  }
}
