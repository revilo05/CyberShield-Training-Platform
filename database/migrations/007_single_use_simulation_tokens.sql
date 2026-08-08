ALTER TABLE campaign_targets ADD COLUMN IF NOT EXISTS token_consumed_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS campaign_targets_token_idx ON campaign_targets(token_hash) WHERE token_hash IS NOT NULL;
