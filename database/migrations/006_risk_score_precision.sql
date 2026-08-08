ALTER TABLE risk_score_snapshots ALTER COLUMN score TYPE NUMERIC(5,1) USING score::NUMERIC;
ALTER TABLE risk_score_snapshots ALTER COLUMN confidence TYPE NUMERIC(5,1) USING confidence::NUMERIC;
ALTER TABLE risk_score_snapshots ALTER COLUMN exposure_context TYPE VARCHAR(60);
