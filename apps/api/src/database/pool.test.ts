import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env.js';
import { buildPoolConfig } from './pool.js';

const pem = '-----BEGIN CERTIFICATE-----\nZmFrZS10ZXN0LWNh\n-----END CERTIFICATE-----\n';

describe('PostgreSQL pool TLS configuration', () => {
  it('decodes the Base64 CA in memory and enables strict certificate verification', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:password@db.example.com:6543/postgres?sslmode=require&application_name=test',
      DATABASE_SSL_CA_BASE64: Buffer.from(pem).toString('base64'),
      DATABASE_POOL_MAX: '4',
      CRON_SECRET: 'a'.repeat(32),
      AUTH0_DOMAIN: 'tenant.example.com',
      AUTH0_AUDIENCE: 'cybershield-api'
    });

    const poolConfig = buildPoolConfig(config);

    expect(config.databaseSslCa).toBe(pem);
    expect(poolConfig.max).toBe(4);
    expect(poolConfig.ssl).toEqual({ ca: pem, rejectUnauthorized: true });
    expect(poolConfig.connectionString).not.toContain('sslmode');
    expect(poolConfig.connectionString).toContain('application_name=test');
  });

  it('uses a conservative production pool default', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:password@db.example.com:6543/postgres',
      CRON_SECRET: 'a'.repeat(32),
      AUTH0_DOMAIN: 'tenant.example.com',
      AUTH0_AUDIENCE: 'cybershield-api'
    });

    expect(config.databasePoolMax).toBe(3);
    expect(buildPoolConfig(config).max).toBe(3);
  });

  it('leaves SSL configuration to Node and the connection string when no Base64 CA is present', () => {
    const config = loadConfig({ NODE_ENV: 'development', DATABASE_SSL_CA_BASE64: '' });
    const poolConfig = buildPoolConfig(config);

    expect(config.databasePoolMax).toBe(8);
    expect(config.databaseSslCa).toBeUndefined();
    expect(poolConfig.ssl).toBeUndefined();
    expect(poolConfig.connectionString).toBe(config.databaseUrl);
  });

  it('rejects values that do not decode to a PEM certificate', () => {
    expect(() => loadConfig({ DATABASE_SSL_CA_BASE64: Buffer.from('not a certificate').toString('base64') }))
      .toThrow('DATABASE_SSL_CA_BASE64 must decode to a PEM certificate.');
    expect(() => loadConfig({ DATABASE_SSL_CA_BASE64: 'not-base64!' }))
      .toThrow('DATABASE_SSL_CA_BASE64 must contain valid Base64.');
  });
});
