/**
 * Secrets Service
 * Manages retrieval and caching of secrets from the database
 */

import { Secret } from '@infrastructure/config/secrets/secret.model';
import { isDatabaseConnected } from '@infrastructure/database/connection';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { injectFromContainer } from '@/app/di-container/container-helper';

/**
 * In-memory cache for secrets to avoid repeated database queries
 */
const secretsCache = new Map<string, string>();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Cache timestamps
 */
const cacheTimestamps = new Map<string, number>();

/**
 * Get a secret value from the database with caching
 * @param key Secret key to retrieve
 * @returns Secret value or undefined if not found
 * @throws Error if database is not connected
 */
export async function getSecret(key: string): Promise<string | undefined> {
  const logger = injectFromContainer(LoggerService);
  if (!isDatabaseConnected()) {
    const message = 'Database not connected. Cannot retrieve secrets.';
    logger.error(message);
    throw new Error(message);
  }

  // Check cache first
  const cachedValue = secretsCache.get(key);
  const cachedTime = cacheTimestamps.get(key);

  if (cachedValue && cachedTime && Date.now() - cachedTime < CACHE_TTL) {
    logger.info(`[Secrets] Using cached value for key: ${key}`);
    return cachedValue;
  }

  try {
    // Fetch from database
    const secret = await Secret.findOne({ key }).lean();

    if (secret?.value) {
      // Cache the value
      secretsCache.set(key, secret.value);
      cacheTimestamps.set(key, Date.now());
      logger.info(`[Secrets] Retrieved and cached secret: ${key}`);
      return secret.value;
    } else {
      logger.warn(`[Secrets] Secret not found in database: ${key}`);
      return undefined;
    }
  } catch (error) {
    logger.error({ error }, `[Secrets] Error fetching secret ${key}`);
    throw error;
  }
}

/**
 * Get LLM API key from database
 * @returns LLM API key or undefined if not found
 * @throws Error if database is not connected
 */
export async function getLLMApiKey(): Promise<string | undefined> {
  return getSecret('llmkey');
}

/**
 * Clear the secrets cache
 * Useful for testing or when secrets are updated
 */
export function clearSecretsCache(): void {
  secretsCache.clear();
  cacheTimestamps.clear();
  injectFromContainer(LoggerService).info('[Secrets] Cache cleared');
}
