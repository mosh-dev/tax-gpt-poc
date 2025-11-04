import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import dotenv from 'dotenv';

dotenv.config();

/**
 * LMStudio client configured as OpenAI-compatible provider
 * Connects to local LMStudio instance running at configured URL
 */
export const lmStudioClient = createOpenAICompatible({
  name: 'lm-studio',
  baseURL: process.env.LMSTUDIO_URL || 'http://192.168.0.188:1234/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get the configured LMStudio model
 */
export const getLMStudioModel = () => {
  const modelName = process.env.LMSTUDIO_MODEL || 'openai/gpt-oss-20b';
  return lmStudioClient(modelName);
};