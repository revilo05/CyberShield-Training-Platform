ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE campaign_targets ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE delivery_attempts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events(available_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS campaign_targets_pending_idx ON campaign_targets(campaign_id, target_status);

CREATE TABLE IF NOT EXISTS anonymized_monthly_metrics (
  company_id UUID NOT NULL REFERENCES companies(id),
  month DATE NOT NULL,
  department VARCHAR(120) NOT NULL,
  metric VARCHAR(80) NOT NULL,
  value NUMERIC(14,2) NOT NULL,
  sample_size INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY(company_id, month, department, metric)
);

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.retention_job', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apply_company_retention(target_company UUID) RETURNS JSONB AS $$
DECLARE
  cutoff TIMESTAMP;
  behavior_deleted INTEGER := 0;
  snapshots_deleted INTEGER := 0;
  audits_deleted INTEGER := 0;
BEGIN
  SELECT NOW() - make_interval(days => retention_days) INTO cutoff FROM companies WHERE id=target_company;
  IF cutoff IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;
  PERFORM set_config('app.company_id', target_company::text, true);
  PERFORM set_config('app.retention_job', 'true', true);

  INSERT INTO anonymized_monthly_metrics(company_id,month,department,metric,value,sample_size)
  SELECT e.company_id,date_trunc('month',e.occurred_at)::date,COALESCE(u.department,'UNKNOWN'),'behavior.'||LOWER(e.event_type),COUNT(*)::numeric,COUNT(DISTINCT e.user_id)
  FROM behavior_events e JOIN users u ON u.id=e.user_id WHERE e.company_id=target_company AND e.occurred_at<cutoff
  GROUP BY e.company_id,date_trunc('month',e.occurred_at),COALESCE(u.department,'UNKNOWN'),e.event_type
  ON CONFLICT(company_id,month,department,metric) DO UPDATE SET value=EXCLUDED.value,sample_size=EXCLUDED.sample_size;

  INSERT INTO anonymized_monthly_metrics(company_id,month,department,metric,value,sample_size)
  SELECT s.company_id,date_trunc('month',s.calculated_at)::date,COALESCE(u.department,'UNKNOWN'),'risk.average',ROUND(AVG(s.score),2),COUNT(DISTINCT s.user_id)
  FROM risk_score_snapshots s JOIN users u ON u.id=s.user_id WHERE s.company_id=target_company AND s.calculated_at<cutoff
  GROUP BY s.company_id,date_trunc('month',s.calculated_at),COALESCE(u.department,'UNKNOWN')
  ON CONFLICT(company_id,month,department,metric) DO UPDATE SET value=EXCLUDED.value,sample_size=EXCLUDED.sample_size;

  DELETE FROM behavior_events WHERE company_id=target_company AND occurred_at<cutoff; GET DIAGNOSTICS behavior_deleted=ROW_COUNT;
  DELETE FROM risk_score_snapshots WHERE company_id=target_company AND calculated_at<cutoff; GET DIAGNOSTICS snapshots_deleted=ROW_COUNT;
  DELETE FROM quiz_attempts WHERE company_id=target_company AND completed_at<cutoff;
  DELETE FROM simulation_results r USING users u WHERE r.user_id=u.id AND u.company_id=target_company AND r.completed_at<cutoff;
  DELETE FROM campaign_targets t USING campaigns c WHERE t.campaign_id=c.id AND c.company_id=target_company AND c.completed_at<cutoff;
  DELETE FROM audit_logs WHERE company_id=target_company AND created_at<cutoff; GET DIAGNOSTICS audits_deleted=ROW_COUNT;
  DELETE FROM outbox_events WHERE company_id=target_company AND created_at<cutoff;
  RETURN jsonb_build_object('companyId',target_company,'cutoff',cutoff,'behaviorEventsDeleted',behavior_deleted,'riskSnapshotsDeleted',snapshots_deleted,'auditEventsDeleted',audits_deleted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;
