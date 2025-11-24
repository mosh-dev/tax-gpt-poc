import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { env } from './env';
import { getLLMApiKey } from '@services/secrets.service';

/**
 * LLM client instance (initialized after database connection)
 */
let llmClient: ReturnType<typeof createOpenAICompatible> | null = null;

/**
 * Initialize LLM client with API key from database
 * Checks if client exists and skips if already initialized (naturally idempotent)
 * Should be called after database connection is established
 */
export async function initializeLLMClient(): Promise<void> {
  // Check client state to avoid re-initialization
  if (llmClient) {
    console.log('[LLM] Already initialized, skipping initialization');
    return;
  }

  // Fetch API key from database only (no env fallback)
  const apiKey = await getLLMApiKey();

  if (!apiKey) {
    throw new Error('LLM API key not found in database. Please ensure the "llmkey" secret is set in the secrets collection.');
  }

  // Create LLM client with database API key
  llmClient = createOpenAICompatible({
    name: 'llm-provider',
    baseURL: env.LLM_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  console.log(`[LLM] Base URL: ${env.LLM_BASE_URL}`);
  console.log(`[LLM] Model: ${env.LLM_MODEL}`);
}

/**
 * Get the LLM client instance
 * Throws error if client not initialized
 */
function getLLMClient(): ReturnType<typeof createOpenAICompatible> {
  if (!llmClient) {
    throw new Error('LLM client not initialized. Call initializeLLMClient() first.');
  }
  return llmClient;
}

/**
 * Get the configured LLM model
 */
export const getOpenAiModel = () => {
  return getLLMClient()(env.LLM_MODEL);
};
