import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { env } from './env';

/**
 * LLM client configured as OpenAI-compatible provider
 * Connects to LMStudio, OpenAI, or any OpenAI-compatible endpoint
 */
export const llmClient = createOpenAICompatible({
  name: 'llm-provider',
  baseURL: env.LLM_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(env.LLM_API_KEY && { 'Authorization': `Bearer ${env.LLM_API_KEY}` }),
  },
});

/**
 * Get the configured LLM model
 */
export const getOpenAiModel = () => {
  return llmClient(env.LLM_MODEL);
};

// Keep backward compatibility alias
export const lmStudioClient = llmClient;