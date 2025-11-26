import { GenerateMode } from '@infrastructure/ai/llm-client';

export interface ExtractionInput {
  text: string | string[];
  context?: Record<string, any>;
}

export interface ExtractionOptions {
  maxTokens?: number;
  systemPrompt?: string;
  useCache?: boolean
}

export interface ExtractionMetadata {
  originalTokens: number;
  finalTokens: number;
  wasTruncated: boolean;
  cacheHit: boolean;
  modelName: string;
  generateMode: GenerateMode;
}
