CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auth0_org_id VARCHAR(180);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS retention_days INTEGER NOT NULL DEFAULT 365;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS allowed_email_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE companies SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_uidx ON companies(slug);

ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS users_company_external_uidx ON users(company_id, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS slug VARCHAR(160);
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS audience_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS mitre_technique_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS review_due_at TIMESTAMP;
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS approved_by VARCHAR(160);

ALTER TABLE simulations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS slug VARCHAR(160);
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS channel VARCHAR(40) NOT NULL DEFAULT 'EMAIL';
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS difficulty_score INTEGER NOT NULL DEFAULT 50 CHECK (difficulty_score BETWEEN 0 AND 100);
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS observable_cues JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS premise_alignment VARCHAR(20) NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS audience_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS mitre_technique_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS expected_behavior VARCHAR(240);
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE simulation_results ADD COLUMN IF NOT EXISTS selected_option_id VARCHAR(100);
ALTER TABLE simulation_results ADD COLUMN IF NOT EXISTS reported_threat BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE simulation_results ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE simulation_results ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER;

CREATE TABLE IF NOT EXISTS score_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(40) NOT NULL UNIQUE,
  weights JSONB NOT NULL,
  half_life_days INTEGER NOT NULL DEFAULT 90,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level VARCHAR(20) NOT NULL CHECK (level IN ('LOW', 'MEDIUM', 'HIGH')),
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  confidence_label VARCHAR(20) NOT NULL CHECK (confidence_label IN ('LOW', 'MEDIUM', 'HIGH')),
  exposure_context VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
  score_version VARCHAR(40) NOT NULL REFERENCES score_versions(version),
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS risk_snapshots_user_date_idx ON risk_score_snapshots(user_id, calculated_at DESC);

CREATE TABLE IF NOT EXISTS risk_score_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES risk_score_snapshots(id) ON DELETE CASCADE,
  factor VARCHAR(80) NOT NULL,
  normalized_value NUMERIC(7,4) NOT NULL,
  weight NUMERIC(7,4) NOT NULL,
  contribution NUMERIC(8,4) NOT NULL,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  channel VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES scenario_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject VARCHAR(240) NOT NULL,
  sender_name VARCHAR(160) NOT NULL,
  sender_address VARCHAR(180) NOT NULL,
  body_html TEXT NOT NULL,
  landing_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  difficulty_score INTEGER NOT NULL CHECK (difficulty_score BETWEEN 0 AND 100),
  observable_cues JSONB NOT NULL DEFAULT '[]'::jsonb,
  premise_alignment VARCHAR(20) NOT NULL,
  audience_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  mitre_technique_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  expected_behavior VARCHAR(240) NOT NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, version)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(180) NOT NULL,
  scenario_version_id UUID NOT NULL REFERENCES scenario_versions(id),
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  scheduled_at TIMESTAMP,
  send_window_start TIME,
  send_window_end TIME,
  excluded_user_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  max_recipients INTEGER NOT NULL DEFAULT 2000 CHECK (max_recipients BETWEEN 1 AND 2000),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS campaigns_company_status_idx ON campaigns(company_id, status);

CREATE TABLE IF NOT EXISTS campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(128),
  token_expires_at TIMESTAMP,
  target_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  campaign_target_id UUID NOT NULL REFERENCES campaign_targets(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL,
  provider_message_id VARCHAR(240),
  status VARCHAR(30) NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  error_code VARCHAR(120),
  error_message TEXT,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_target_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  campaign_id UUID REFERENCES campaigns(id),
  scenario_version_id UUID REFERENCES scenario_versions(id),
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('DELIVERED', 'BOUNCED', 'CLICKED', 'ATTEMPTED_ACTION', 'REPORTED', 'IGNORED')),
  idempotency_key VARCHAR(180) NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  response_time_seconds INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS behavior_events_user_date_idx ON behavior_events(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  module_id UUID NOT NULL REFERENCES training_modules(id),
  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN ('PRE', 'POST')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(180),
  correlation_id VARCHAR(120),
  ip_hash VARCHAR(128),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_company_date_idx ON audit_logs(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  event_type VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP,
  available_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events(available_at) WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'NOT_CONFIGURED',
  external_tenant_id VARCHAR(200),
  encrypted_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_checked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, provider)
);

CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED')),
  title VARCHAR(180) NOT NULL,
  content_type VARCHAR(40) NOT NULL,
  payload JSONB NOT NULL,
  model VARCHAR(100),
  prompt_version VARCHAR(40),
  requested_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  url TEXT NOT NULL,
  secret_hash VARCHAR(128) NOT NULL,
  event_types TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO score_versions(version, weights, half_life_days, active)
VALUES ('HRS-2.0', '{"simulationResilience":0.40,"reportingReadiness":0.25,"learningMastery":0.20,"recurrence":0.15}', 90, TRUE)
ON CONFLICT (version) DO UPDATE SET weights = EXCLUDED.weights, half_life_days = EXCLUDED.half_life_days, active = TRUE;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_score_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_companies_policy ON companies;
CREATE POLICY tenant_companies_policy ON companies USING (id = NULLIF(current_setting('app.company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_users_policy ON users;
CREATE POLICY tenant_users_policy ON users USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_campaigns_policy ON campaigns;
CREATE POLICY tenant_campaigns_policy ON campaigns USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_targets_policy ON campaign_targets;
CREATE POLICY tenant_targets_policy ON campaign_targets USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_behavior_policy ON behavior_events;
CREATE POLICY tenant_behavior_policy ON behavior_events USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_audit_policy ON audit_logs;
CREATE POLICY tenant_audit_policy ON audit_logs USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_risk_policy ON risk_score_snapshots;
CREATE POLICY tenant_risk_policy ON risk_score_snapshots USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
