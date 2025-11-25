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

  getModelGenerateMode(modelName: string): 'tool' | 'json' {
    const model = modelName.toLowerCase();

    switch (true) {
      case model.includes('gpt-4'):
      case model.includes('gpt-3.5'):
      case model.includes('gpt-5'):
      case model.includes('claude'):
      case model.includes('gemini'):
        return 'tool';

      default:
        return 'json';
    }
  },

  get LLM_GENERATE_MODE(): 'tool' | 'json' {
    return this.getModelGenerateMode(this.LLM_MODEL);
  },

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
console.log(`[Config] Environment: ${Environment.NODE_ENV}`);
console.log(`[Config] Base URL: ${Environment.BASE_URL}`);
