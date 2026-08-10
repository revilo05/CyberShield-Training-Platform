import { Pool, type PoolConfig } from 'pg';
import type { AppConfig } from '../config/env.js';

const SSL_CONNECTION_PARAMETERS = new Set(['sslmode', 'sslcert', 'sslkey', 'sslrootcert']);

export function buildPoolConfig(config: Pick<AppConfig, 'databaseUrl' | 'databasePoolMax' | 'databaseSslCa'>): PoolConfig {
  const poolConfig: PoolConfig = {
    connectionString: config.databaseSslCa ? withoutSslConnectionParameters(config.databaseUrl) : config.databaseUrl,
    max: config.databasePoolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
    application_name: 'cybershield-api'
  };
  if (config.databaseSslCa) {
    poolConfig.ssl = { ca: config.databaseSslCa, rejectUnauthorized: true };
  }
  return poolConfig;
}

export function createPool(config: AppConfig): Pool {
  return new Pool(buildPoolConfig(config));
}

function withoutSslConnectionParameters(connectionString: string): string {
  const url = new URL(connectionString);
  for (const key of [...url.searchParams.keys()]) {
    if (SSL_CONNECTION_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  return url.toString();
}
