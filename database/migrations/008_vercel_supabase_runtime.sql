ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS lock_id UUID;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS outbox_claimable_idx
  ON outbox_events(available_at, created_at)
  WHERE processed_at IS NULL AND dead_lettered_at IS NULL;

CREATE SCHEMA IF NOT EXISTS private;

DO $migration$
BEGIN
  IF to_regprocedure('public.apply_company_retention(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.apply_company_retention(uuid) SET SCHEMA private';
  END IF;
END
$migration$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;

DO $permissions$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', role_name);
    END IF;
  END LOOP;
END
$permissions$;

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymized_monthly_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_training_modules_policy ON training_modules;
CREATE POLICY tenant_training_modules_policy ON training_modules
  USING (company_id IS NULL OR company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id IS NULL OR company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_training_progress_policy ON training_progress;
CREATE POLICY tenant_training_progress_policy ON training_progress
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id=training_progress.user_id AND u.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id=training_progress.user_id AND u.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid));

DROP POLICY IF EXISTS tenant_simulations_policy ON simulations;
CREATE POLICY tenant_simulations_policy ON simulations
  USING (company_id IS NULL OR company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id IS NULL OR company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_simulation_results_policy ON simulation_results;
CREATE POLICY tenant_simulation_results_policy ON simulation_results
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id=simulation_results.user_id AND u.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id=simulation_results.user_id AND u.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid));

DROP POLICY IF EXISTS tenant_risk_scores_policy ON risk_scores;
CREATE POLICY tenant_risk_scores_policy ON risk_scores
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id=risk_scores.user_id AND u.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id=risk_scores.user_id AND u.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid));

DROP POLICY IF EXISTS tenant_risk_factors_policy ON risk_score_factors;
CREATE POLICY tenant_risk_factors_policy ON risk_score_factors
  USING (EXISTS (SELECT 1 FROM risk_score_snapshots s WHERE s.id=risk_score_factors.snapshot_id AND s.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM risk_score_snapshots s WHERE s.id=risk_score_factors.snapshot_id AND s.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid));

DROP POLICY IF EXISTS tenant_scenario_templates_policy ON scenario_templates;
CREATE POLICY tenant_scenario_templates_policy ON scenario_templates
  USING (company_id IS NULL OR company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id IS NULL OR company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_scenario_versions_policy ON scenario_versions;
CREATE POLICY tenant_scenario_versions_policy ON scenario_versions
  USING (EXISTS (SELECT 1 FROM scenario_templates t WHERE t.id=scenario_versions.template_id AND (t.company_id IS NULL OR t.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)))
  WITH CHECK (EXISTS (SELECT 1 FROM scenario_templates t WHERE t.id=scenario_versions.template_id AND (t.company_id IS NULL OR t.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)));

DROP POLICY IF EXISTS tenant_delivery_attempts_policy ON delivery_attempts;
CREATE POLICY tenant_delivery_attempts_policy ON delivery_attempts
  USING (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_quiz_attempts_policy ON quiz_attempts;
CREATE POLICY tenant_quiz_attempts_policy ON quiz_attempts
  USING (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_integrations_policy ON integration_connections;
CREATE POLICY tenant_integrations_policy ON integration_connections
  USING (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_content_drafts_policy ON content_drafts;
CREATE POLICY tenant_content_drafts_policy ON content_drafts
  USING (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_content_reviews_policy ON content_reviews;
CREATE POLICY tenant_content_reviews_policy ON content_reviews
  USING (EXISTS (SELECT 1 FROM content_drafts d WHERE d.id=content_reviews.draft_id AND d.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM content_drafts d WHERE d.id=content_reviews.draft_id AND d.company_id=NULLIF(current_setting('app.company_id',true),'')::uuid));

DROP POLICY IF EXISTS tenant_webhooks_policy ON webhook_subscriptions;
CREATE POLICY tenant_webhooks_policy ON webhook_subscriptions
  USING (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_outbox_policy ON outbox_events;
CREATE POLICY tenant_outbox_policy ON outbox_events
  USING (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);

DROP POLICY IF EXISTS tenant_anonymized_metrics_policy ON anonymized_monthly_metrics;
CREATE POLICY tenant_anonymized_metrics_policy ON anonymized_monthly_metrics
  USING (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid)
  WITH CHECK (company_id=NULLIF(current_setting('app.company_id',true),'')::uuid);
