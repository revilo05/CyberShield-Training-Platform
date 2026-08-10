import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { loadConfig } from '../config/env.js';
import { createPool } from './pool.js';

export async function runMigrations(pool: Pool, migrationsDirectory = path.resolve(process.cwd(), '../../database/migrations')): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(240) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  const schemaExists = await pool.query<{ exists: string | null }>("SELECT to_regclass('public.companies')::text AS exists");
  if (schemaExists.rows[0]?.exists) {
    await pool.query("INSERT INTO schema_migrations(filename) VALUES ('001_initial_schema.sql'), ('002_mvp_seed.sql') ON CONFLICT DO NOTHING");
  }

  const files = (await readdir(migrationsDirectory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
  for (const filename of files) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
    if (applied.rowCount) continue;
    const sql = await readFile(path.join(migrationsDirectory, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
      await client.query('COMMIT');
      console.log(`Migration applied: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

async function main() {
  const config = loadConfig();
  const pool = createPool(config);
  try { await runMigrations(pool); } finally { await pool.end(); }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
