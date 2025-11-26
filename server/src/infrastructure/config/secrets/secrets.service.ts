/**
 * Secrets Service
 * Manages retrieval and caching of secrets from the database
 */

import { Secret } from '@infrastructure/config/secrets/secret.model';
import { isDatabaseConnected } from '@infrastructure/database/connection';
import { getErrorMessage } from '@utils/error-handler';

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
  // Check if database is connected
  if (!isDatabaseConnected()) {
    throw new Error('Database not connected. Cannot retrieve secrets.');
  }

  // Check cache first
  const cachedValue = secretsCache.get(key);
  const cachedTime = cacheTimestamps.get(key);

  if (cachedValue && cachedTime && Date.now() - cachedTime < CACHE_TTL) {
    console.log(`[Secrets] Using cached value for key: ${key}`);
    return cachedValue;
  }

  try {
    // Fetch from database
    const secret = await Secret.findOne({ key }).lean();

    if (secret?.value) {
      // Cache the value
      secretsCache.set(key, secret.value);
      cacheTimestamps.set(key, Date.now());
      console.log(`[Secrets] Retrieved and cached secret: ${key}`);
      return secret.value;
    } else {
      console.warn(`[Secrets] Secret not found in database: ${key}`);
      return undefined;
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error(`[Secrets] Error fetching secret ${key}:`, errorMsg);
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
  console.log('[Secrets] Cache cleared');
}

/**
 * Set a secret value in the database
 * @param key Secret key
 * @param value Secret value
 */
export async function setSecret(key: string, value: string): Promise<void> {
  if (!isDatabaseConnected()) {
    throw new Error('Database not connected');
  }

  try {
    await Secret.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );

    // Update cache
    secretsCache.set(key, value);
    cacheTimestamps.set(key, Date.now());

    console.log(`[Secrets] Secret updated: ${key}`);
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error(`[Secrets] Error setting secret ${key}:`, errorMsg);
    throw error;
  }
}