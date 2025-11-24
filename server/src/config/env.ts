/**
 * Environment Configuration
 * Centralized environment variable management with validation
 * All environment variables MUST be defined - no fallbacks
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({override: true});

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not defined`);
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
export const env = {
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

  // MongoDB Configuration
  MONGODB_URI: getRequiredEnv('MONGODB_URI'),
  MONGODB_DB_NAME: getRequiredEnv('MONGODB_DB_NAME'),

  DISABLE_VECTOR_STORAGE: getOptionalEnv('DISABLE_VECTOR_STORAGE'),

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
console.log(`[Config] Environment: ${env.NODE_ENV}`);
console.log(`[Config] Base URL: ${env.BASE_URL}`);
