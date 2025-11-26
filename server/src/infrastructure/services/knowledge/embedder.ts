/**
 * Embedder Wrapper
 * Wraps Mastra FastEmbed for generating vector embeddings
 */

import { fastembed } from '@mastra/fastembed';

export interface EmbeddingResult {
  embedding: number[];
  dimensionality: number;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    // FastEmbed returns an array of embeddings (one per input text)
    const {embeddings} = await fastembed.doEmbed({ values: [text] });

    if (!embeddings || embeddings.length === 0) {
      throw new Error('FastEmbed returned no embeddings');
    }

    const embedding = embeddings[0];

    return {
      embedding,
      dimensionality: embedding.length,
    };
  } catch (error) {
    console.error('[Embedder] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out empty texts
  const validTexts = texts.filter((t) => t && t.trim().length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  try {
    // FastEmbed can handle batch processing efficiently
      const {embeddings} = await fastembed.doEmbed({ values: validTexts });

    if (!embeddings || embeddings.length !== validTexts.length) {
      throw new Error('FastEmbed returned incorrect number of embeddings');
    }

    return embeddings.map((embedding) => ({
      embedding,
      dimensionality: embedding.length,
    }));
  } catch (error) {
    console.error('[Embedder] Error generating batch embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get embedding dimensionality (typically 384 for FastEmbed default model)
 */
export async function getEmbeddingDimensionality(): Promise<number> {
  // Generate a test embedding to determine dimensionality
  const result = await generateEmbedding('test');
  return result.dimensionality;
}
