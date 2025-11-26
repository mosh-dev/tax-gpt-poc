import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Environment } from '@config/environment';
import { getLLMApiKey } from '@infrastructure/config/secrets/secrets.service';
import type { LanguageModel } from "ai";

export const MODEL_PURPOSES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SIMPLE_CHAT: 'simpleChat',
  EXTRACTION: 'extraction',
} as const;

export type ModelPurpose = typeof MODEL_PURPOSES[keyof typeof MODEL_PURPOSES];

interface ModelConfig {
  modelName: string;
  baseURL: string;
  generateMode: 'tool' | 'json';
  purpose: ModelPurpose;
}

const llmClients: Map<string, ReturnType<typeof createOpenAICompatible>> = new Map();
const modelConfigs: Map<ModelPurpose, ModelConfig> = new Map();
let isInitialized = false;

export async function initializeLLMClient(): Promise<void> {
  if (isInitialized) {
    console.log('[LLM] Already initialized, skipping initialization');
    return;
  }

  const apiKey = await getLLMApiKey();

  if (!apiKey) {
    throw new Error('LLM API key not found in database. Please ensure the "llmkey" secret is set in the secrets collection.');
  }

  buildModelConfigs();

  const uniqueBaseUrls = new Set(
    Array.from(modelConfigs.values()).map(config => config.baseURL)
  );

  for (const baseURL of uniqueBaseUrls) {
    const client = createOpenAICompatible({
      name: `llm-provider-${baseURL.split('/').pop()}`,
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    llmClients.set(baseURL, client);
    console.log(`[LLM] Created client for base URL: ${baseURL}`);
  }

  console.log('[LLM] Model Registry:');
  for (const [purpose, config] of modelConfigs.entries()) {
    console.log(`  - ${purpose}: ${config.modelName} (mode: ${config.generateMode})`);
  }

  isInitialized = true;
}

function buildModelConfigs(): void {
  modelConfigs.clear();

  modelConfigs.set(MODEL_PURPOSES.PRIMARY, {
    modelName: Environment.LLM_PRIMARY_MODEL,
    baseURL: Environment.LLM_PRIMARY_BASE_URL,
    generateMode: Environment.getModelGenerateMode(Environment.LLM_PRIMARY_MODEL),
    purpose: MODEL_PURPOSES.PRIMARY,
  });

  const secondaryModel = Environment.LLM_SECONDARY_MODEL || Environment.LLM_PRIMARY_MODEL;
  const secondaryBaseUrl = Environment.LLM_SECONDARY_BASE_URL || Environment.LLM_PRIMARY_BASE_URL;
  modelConfigs.set(MODEL_PURPOSES.SECONDARY, {
    modelName: secondaryModel,
    baseURL: secondaryBaseUrl,
    generateMode: Environment.getModelGenerateMode(secondaryModel),
    purpose: MODEL_PURPOSES.SECONDARY,
  });

  const simpleChatModel = Environment.LLM_SIMPLE_CHAT_MODEL || Environment.LLM_PRIMARY_MODEL;
  const simpleChatBaseUrl = Environment.LLM_SIMPLE_CHAT_BASE_URL || Environment.LLM_PRIMARY_BASE_URL;
  modelConfigs.set(MODEL_PURPOSES.SIMPLE_CHAT, {
    modelName: simpleChatModel,
    baseURL: simpleChatBaseUrl,
    generateMode: Environment.getModelGenerateMode(simpleChatModel),
    purpose: MODEL_PURPOSES.SIMPLE_CHAT,
  });

  const extractionModel = Environment.LLM_EXTRACTION_MODEL || Environment.LLM_PRIMARY_MODEL;
  const extractionBaseUrl = Environment.LLM_EXTRACTION_BASE_URL || Environment.LLM_PRIMARY_BASE_URL;
  modelConfigs.set(MODEL_PURPOSES.EXTRACTION, {
    modelName: extractionModel,
    baseURL: extractionBaseUrl,
    generateMode: Environment.getModelGenerateMode(extractionModel),
    purpose: MODEL_PURPOSES.EXTRACTION,
  });
}

export function getModelByPurpose(purpose: ModelPurpose): LanguageModel {
  if (!isInitialized) {
    throw new Error('LLM client not initialized. Call initializeLLMClient() first.');
  }

  const config = modelConfigs.get(purpose);
  if (!config) {
    throw new Error(`No configuration found for model purpose: ${purpose}`);
  }

  const client = llmClients.get(config.baseURL);
  if (!client) {
    throw new Error(`No client found for base URL: ${config.baseURL}`);
  }

  return client.chatModel(config.modelName);
}

export const getPrimaryModel = (): LanguageModel => {
  return getModelByPurpose(MODEL_PURPOSES.PRIMARY);
};

export const getSecondaryModel = (): LanguageModel => {
  return getModelByPurpose(MODEL_PURPOSES.SECONDARY);
};

export const getSimpleChatModel = (): LanguageModel => {
  return getModelByPurpose(MODEL_PURPOSES.SIMPLE_CHAT);
};

export const getExtractionModel = (): LanguageModel => {
  return getModelByPurpose(MODEL_PURPOSES.EXTRACTION);
};

export const getGenerateMode = (purpose: ModelPurpose = MODEL_PURPOSES.PRIMARY): 'tool' | 'json' => {
  const config = modelConfigs.get(purpose);
  if (!config) {
    throw new Error(`No configuration found for model purpose: ${purpose}`);
  }
  return config.generateMode;
};

export const getOpenAiModel = (): LanguageModel => {
  return getPrimaryModel();
};

export const getModelConfigs = (): ReadonlyMap<ModelPurpose, Readonly<ModelConfig>> => {
  return modelConfigs;
};

export const isSpecializedModel = (purpose: ModelPurpose): boolean => {
  const primaryConfig = modelConfigs.get(MODEL_PURPOSES.PRIMARY);
  const purposeConfig = modelConfigs.get(purpose);

  if (!primaryConfig || !purposeConfig) return false;

  return primaryConfig.modelName !== purposeConfig.modelName;
};
