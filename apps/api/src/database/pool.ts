import { Pool } from 'pg';
import type { AppConfig } from '../config/env.js';

export function createPool(config: AppConfig): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: config.nodeEnv === 'production' ? 20 : 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'cybershield-api'
  });
}
