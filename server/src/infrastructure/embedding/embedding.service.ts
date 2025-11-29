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

  // FastEmbed returns an array of embeddings (one per input text)
  const { embeddings } = await fastembed.doEmbed({ values: [text] });

  if (!embeddings || embeddings.length === 0) {
    throw new Error('FastEmbed returned no embeddings');
  }

  const embedding = embeddings[0];

  return {
    embedding,
    dimensionality: embedding.length,
  };
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

  const { embeddings } = await fastembed.doEmbed({ values: validTexts });

  if (!embeddings || embeddings.length !== validTexts.length) {
    throw new Error('FastEmbed returned incorrect number of embeddings');
  }

  return embeddings.map((embedding) => ({
    embedding,
    dimensionality: embedding.length,
  }));
}
