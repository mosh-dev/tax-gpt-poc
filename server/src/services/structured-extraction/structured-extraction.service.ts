import { z } from 'zod';
import { generateObject } from 'ai';
import { getGenerateMode, getModelByPurpose, getModelConfigs, MODEL_PURPOSES } from '@config/llm';
import { truncateToTokenLimit } from './token-manager';
import { generateCacheKey, getCache } from './cache-manager';
import type { ExtractionInput, ExtractionMetadata, ExtractionOptions } from './types';

const DEFAULT_MAX_TOKENS = 12000;

export async function extractStructuredData<T extends z.ZodTypeAny>(
  input: ExtractionInput,
  schema: T,
  options?: ExtractionOptions
): Promise<z.infer<T>> {
  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    systemPrompt,
    useCache = true
  } = options || {};

  if (!input.text || (Array.isArray(input.text) && input.text.length === 0)) {
    throw new Error('Extraction input text cannot be empty');
  }

  const modelPurpose = MODEL_PURPOSES.EXTRACTION;

  const model = getModelByPurpose(modelPurpose);
  const generateMode = getGenerateMode(modelPurpose);
  const modelConfig = getModelConfigs().get(modelPurpose);
  const modelName = modelConfig?.modelName || 'unknown';

  const cache = getCache();
  const cacheKey = generateCacheKey({
    text: input.text,
    schema,
    modelName,
    context: input.context,
  });

  if (useCache) {
    const cached = cache.get<z.infer<T>>(cacheKey);
    if (cached) {
      console.log('[StructuredExtraction] Cache hit');
      return cached;
    }
  }

  const textArray = Array.isArray(input.text) ? input.text : [input.text];
  const combinedText = textArray.join('\n\n');

  const truncationResult = truncateToTokenLimit(combinedText, maxTokens, {
    preserveEnding: false,
    truncationMarker: '\n\n[... text truncated due to length ...]',
  });

  if (truncationResult.wasTruncated) {
    console.log(
      `[StructuredExtraction] Text truncated: ${truncationResult.originalTokens} → ${truncationResult.finalTokens} tokens`
    );
  }

  const finalText = typeof truncationResult.truncated === 'string'
    ? truncationResult.truncated
    : truncationResult.truncated.join('\n\n');

  const prompt = systemPrompt
    ? `${systemPrompt}\n\nInput:\n${finalText}`
    : finalText;

  console.log(`[StructuredExtraction] Extracting with model: ${modelName} (mode: ${generateMode})`);

  try {
    const result = await generateObject({
      model,
      schema,
      prompt,
      mode: generateMode,
    });

    if (!result.object) {
      throw new Error('AI returned null/undefined result');
    }

    if (useCache) {
      cache.set(cacheKey, result.object);
    }

    return result.object;
  } catch (error: any) {
    console.error('[StructuredExtraction] Error during extraction:', {
      error: error.message || error,
      modelName,
      generateMode,
      textLength: finalText.length,
    });
    throw error;
  }
}

export async function extractStructuredDataWithMetadata<T extends z.ZodTypeAny>(
  input: ExtractionInput,
  schema: T,
  options?: ExtractionOptions
): Promise<{ data: z.infer<T>; metadata: ExtractionMetadata }> {
  const { maxTokens = DEFAULT_MAX_TOKENS } = options || {};

  const modelPurpose = MODEL_PURPOSES.EXTRACTION;

  const modelConfigs = getModelConfigs();
  const modelConfig = modelConfigs.get(modelPurpose);
  const modelName = modelConfig?.modelName || 'unknown';
  const generateMode = getGenerateMode(modelPurpose);

  const cache = getCache();
  const cacheKey = generateCacheKey({
    text: input.text,
    schema,
    modelName,
    context: input.context,
  });

  const cacheHit = cache.get<z.infer<T>>(cacheKey) !== undefined;

  const textArray = Array.isArray(input.text) ? input.text : [input.text];
  const combinedText = textArray.join('\n\n');

  const truncationResult = truncateToTokenLimit(combinedText, maxTokens, {
    preserveEnding: false,
    truncationMarker: '\n\n[... text truncated due to length ...]',
  });

  const data = await extractStructuredData(input, schema, options);

  return {
    data,
    metadata: {
      originalTokens: truncationResult.originalTokens,
      finalTokens: truncationResult.finalTokens,
      wasTruncated: truncationResult.wasTruncated,
      cacheHit,
      modelName,
      generateMode,
    },
  };
}
