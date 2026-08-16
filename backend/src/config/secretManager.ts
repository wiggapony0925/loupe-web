/**
 * GCP Secret Manager integration.
 *
 * On Cloud Run the preferred wiring is `--set-secrets` (the platform injects
 * secrets as env vars before the process starts), so this module is usually a
 * no-op there. It exists for local development against real secrets and for
 * jobs/scripts: set SECRET_MANAGER_PROJECT and any variable listed below that
 * is MISSING from the environment gets pulled from Secret Manager via ADC.
 * Explicit env always wins — Secret Manager only fills gaps.
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { logger } from '../utils/logger';

const SECRET_ENV_KEYS = [
  'DATABASE_URL',
  'ENCRYPTION_KEY',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'EMAIL_WEBHOOK_TOKEN',
  'CRON_KEY',
] as const;

let client: SecretManagerServiceClient | null = null;
const cache = new Map<string, string>();

function getClient(): SecretManagerServiceClient {
  if (!client) client = new SecretManagerServiceClient();
  return client;
}

export async function getSecret(
  name: string,
  { project = process.env.SECRET_MANAGER_PROJECT, version = 'latest' }: { project?: string; version?: string } = {},
): Promise<string> {
  if (!project) throw new Error('SECRET_MANAGER_PROJECT is not set');
  const cacheKey = `${project}/${name}/${version}`;
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit;

  const [response] = await getClient().accessSecretVersion({
    name: `projects/${project}/secrets/${name}/versions/${version}`,
  });
  const value = response.payload?.data?.toString() ?? '';
  cache.set(cacheKey, value);
  return value;
}

export async function hydrateEnvFromSecretManager(): Promise<void> {
  const project = process.env.SECRET_MANAGER_PROJECT;
  if (!project) return; // Cloud Run --set-secrets path, or plain local .env

  const missing = SECRET_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length === 0) return;

  for (const key of missing) {
    try {
      const value = await getSecret(key, { project });
      if (value) {
        process.env[key] = value;
        logger.debug({ key }, 'hydrated env var from Secret Manager');
      }
    } catch (err) {
      // A secret that simply doesn't exist is fine (e.g. CRON_KEY unused in
      // this deployment); validateProductionConfig decides what's fatal.
      logger.warn({ key, err: (err as Error).message }, 'could not hydrate secret');
    }
  }
}
