/**
 * Environment configuration — validated once, typed everywhere.
 *
 * Boot order matters: secretManager.hydrateEnvFromSecretManager() runs first
 * and only fills variables that are MISSING, so an explicitly set env var
 * always wins over Secret Manager (the loupe rule). After hydration, env()
 * parses and caches; a bad production config refuses to boot rather than
 * limping into an insecure state.
 */
import { z } from 'zod';

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  ENCRYPTION_KEY: z.string().default(''),
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),

  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_SECRET: z.string().default(''),
  PLAID_WEBHOOK_VERIFY: boolFromString,
  /** Public URL Plaid calls back, e.g. https://api.trackify.app/v1/webhooks/plaid */
  PLAID_WEBHOOK_URL: z.string().default(''),

  EMAIL_WEBHOOK_TOKEN: z.string().default(''),
  CRON_KEY: z.string().default(''),

  CORS_ORIGINS: z.string().default(''),
  GCS_STATEMENTS_BUCKET: z.string().default(''),
  SECRET_MANAGER_PROJECT: z.string().default(''),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    cached = EnvSchema.parse(process.env);
  }
  return cached;
}

/** Test hook — lets suites mutate process.env between cases. */
export function resetEnvCache(): void {
  cached = null;
}

export function corsOrigins(): string[] {
  return env()
    .CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Refuse to boot a production process with a config that silently disables a
 * security control. A missing webhook token doesn't crash at request time —
 * it accepts spoofed transactions — so it has to crash here instead.
 */
export function validateProductionConfig(): void {
  const e = env();
  if (e.NODE_ENV !== 'production') return;

  const problems: string[] = [];
  if (!e.ENCRYPTION_KEY) problems.push('ENCRYPTION_KEY is empty (Plaid tokens would be unencryptable)');
  if (!e.EMAIL_WEBHOOK_TOKEN) problems.push('EMAIL_WEBHOOK_TOKEN is empty (ingest endpoint would accept spoofed email)');
  if (!e.PLAID_WEBHOOK_VERIFY) problems.push('PLAID_WEBHOOK_VERIFY is off (Plaid webhooks would be unauthenticated)');
  if (e.PLAID_ENV === 'production' && (!e.PLAID_CLIENT_ID || !e.PLAID_SECRET)) {
    problems.push('PLAID_ENV=production but PLAID_CLIENT_ID/PLAID_SECRET are missing');
  }

  if (problems.length > 0) {
    throw new Error(`Refusing to start with insecure production config:\n - ${problems.join('\n - ')}`);
  }
}
