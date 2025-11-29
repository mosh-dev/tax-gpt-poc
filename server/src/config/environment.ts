/**
 * Environment Configuration
 * Centralized environment variable management with validation
 * All environment variables MUST be defined - no fallbacks
 */

import dotenv from 'dotenv';
import { pinoServerLogger } from '@utils/pino-logger';

// Load environment variables
dotenv.config({ override: true });

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const message = `Required environment variable ${key} is not defined`;
    throw new Error(message);
  }
  return value;
}

/**
 * Get optional environment variable
 */
function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Environment configuration object
 * All required variables are validated at module load time
 */
export const Environment = {
  // Server Configuration
  PORT: parseInt(getRequiredEnv('PORT'), 10),
  SERVER_PORT: parseInt(getOptionalEnv('SERVER_PORT') || getRequiredEnv('PORT'), 10),
  NODE_ENV: getRequiredEnv('NODE_ENV'),
  BASE_URL: getRequiredEnv('BASE_URL'),

  // Client URL (for CORS)
  CLIENT_URL: getRequiredEnv('CLIENT_URL'),

  // LLM Configuration (LMStudio, OpenAI, or compatible)
  LLM_BASE_URL: getRequiredEnv('LLM_BASE_URL'),
  LLM_MODEL: getRequiredEnv('LLM_MODEL'),

  LLM_PRIMARY_MODEL: getOptionalEnv('LLM_PRIMARY_MODEL') || getRequiredEnv('LLM_MODEL'),
  LLM_PRIMARY_BASE_URL: getOptionalEnv('LLM_PRIMARY_BASE_URL') || getRequiredEnv('LLM_BASE_URL'),

  LLM_EXTRACTION_MODEL: getOptionalEnv('LLM_EXTRACTION_MODEL'),
  LLM_EXTRACTION_BASE_URL: getOptionalEnv('LLM_EXTRACTION_BASE_URL'),

  LLM_SECONDARY_MODEL: getOptionalEnv('LLM_SECONDARY_MODEL'),
  LLM_SECONDARY_BASE_URL: getOptionalEnv('LLM_SECONDARY_BASE_URL'),

  LLM_SIMPLE_CHAT_MODEL: getOptionalEnv('LLM_SIMPLE_CHAT_MODEL'),
  LLM_SIMPLE_CHAT_BASE_URL: getOptionalEnv('LLM_SIMPLE_CHAT_BASE_URL'),

  // MongoDB Configuration
  MONGODB_URI: getRequiredEnv('MONGODB_URI'),
  MONGODB_DB_NAME: getRequiredEnv('MONGODB_DB_NAME'),

  DISABLE_VECTOR_STORAGE: getOptionalEnv('DISABLE_VECTOR_STORAGE') === 'true',

  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(getRequiredEnv('MAX_FILE_SIZE'), 10),

  // JWT Configuration
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: getOptionalEnv('JWT_EXPIRES_IN') || '15m',
  JWT_REFRESH_EXPIRES_IN: getOptionalEnv('JWT_REFRESH_EXPIRES_IN') || '7d',
  FORCE_SEED_SYSTEM_INSTRUCTION: getOptionalEnv('FORCE_SEED_SYSTEM_INSTRUCTION') == 'true',
  MASTRA_START_SERVER: getOptionalEnv('MASTRA_START_SERVER') == 'true',
} as const;

// Validate configuration at startup
pinoServerLogger.info(`[Config] Environment: ${Environment.NODE_ENV}`);
pinoServerLogger.info(`[Config] Base URL: ${Environment.BASE_URL}`);
