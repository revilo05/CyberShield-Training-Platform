import { z } from 'zod';

const booleanFromString = z.string().optional().transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url().default('postgresql://cybershield:cybershield@localhost:5432/cybershield'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DEMO_MODE: booleanFromString,
  AUTO_MIGRATE: booleanFromString,
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  AUTH0_ISSUER: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  SES_FROM_EMAIL: z.string().email().optional(),
  OPENAI_API_KEY: z.string().optional(),
  WEBHOOK_ALLOWED_HOSTS: z.string().default(''),
  OPENAI_AUTHORING_MODEL: z.string().default('gpt-5.6-terra'),
  SIMULATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().max(168).default(72)
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  redisUrl: string;
  webOrigin: string;
  demoMode: boolean;
  autoMigrate: boolean;
  auth0: { domain?: string; audience?: string; issuer?: string; configured: boolean };
  microsoft: { tenantId?: string; clientId?: string; clientSecret?: string; configured: boolean };
  aws: { region: string; sesFromEmail?: string; configured: boolean };
  openai: { apiKey?: string; model: string; configured: boolean };
  simulationTokenTtlHours: number;
  webhookAllowedHosts: string[];
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const env = envSchema.parse(environment);
  const demoMode = env.NODE_ENV !== 'production' && (environment.DEMO_MODE === undefined || env.DEMO_MODE);
  const autoMigrate = env.NODE_ENV !== 'production' && (environment.AUTO_MIGRATE === undefined || env.AUTO_MIGRATE);
  const auth0Configured = Boolean(env.AUTH0_DOMAIN && env.AUTH0_AUDIENCE);
  if (env.NODE_ENV === 'production' && !auth0Configured) {
    throw new Error('AUTH0_DOMAIN y AUTH0_AUDIENCE son obligatorios en producción.');
  }
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    webOrigin: env.WEB_ORIGIN,
    demoMode,
    autoMigrate,
    auth0: { domain: env.AUTH0_DOMAIN, audience: env.AUTH0_AUDIENCE, issuer: env.AUTH0_ISSUER, configured: auth0Configured },
    microsoft: { tenantId: env.MICROSOFT_TENANT_ID, clientId: env.MICROSOFT_CLIENT_ID, clientSecret: env.MICROSOFT_CLIENT_SECRET, configured: Boolean(env.MICROSOFT_TENANT_ID && env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) },
    aws: { region: env.AWS_REGION, sesFromEmail: env.SES_FROM_EMAIL, configured: Boolean(env.SES_FROM_EMAIL) },
    openai: { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_AUTHORING_MODEL, configured: Boolean(env.OPENAI_API_KEY) },
    webhookAllowedHosts: env.WEBHOOK_ALLOWED_HOSTS.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean),
    simulationTokenTtlHours: env.SIMULATION_TOKEN_TTL_HOURS
  };
}
