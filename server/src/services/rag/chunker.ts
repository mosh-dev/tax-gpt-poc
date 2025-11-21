/**
 * Document Chunker
 * Splits documents into overlapping chunks for RAG
 */

export interface ChunkConfig {
  maxChunkSize: number; // Max characters per chunk (default: 3000 ≈ 750 tokens)
  chunkOverlap: number; // Overlap between chunks (default: 400 ≈ 100 tokens)
  preserveParagraphs: boolean; // Try to split on paragraph boundaries
}

export interface DocumentChunk {
  content: string;
  index: number; // Chunk index in document
  metadata: {
    startChar: number;
    endChar: number;
    totalChunks?: number;
  };
}

const DEFAULT_CONFIG: ChunkConfig = {
  maxChunkSize: 3000, // ~750 tokens (4 chars ≈ 1 token)
  chunkOverlap: 400, // ~100 tokens overlap
  preserveParagraphs: true,
};

/**
 * Chunk a document into overlapping segments
 */
export function chunkDocument(
  content: string,
  config: Partial<ChunkConfig> = {}
): DocumentChunk[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxChunkSize, chunkOverlap, preserveParagraphs } = finalConfig;

  if (!content || content.trim().length === 0) {
    return [];
  }

  // Normalize whitespace and newlines
  const normalizedContent = content.replace(/\r\n/g, '\n').trim();

  // If content is smaller than max chunk size, return as single chunk
  if (normalizedContent.length <= maxChunkSize) {
    return [
      {
        content: normalizedContent,
        index: 0,
        metadata: {
          startChar: 0,
          endChar: normalizedContent.length,
          totalChunks: 1,
        },
      },
    ];
  }

  const chunks: DocumentChunk[] = [];
  let startPos = 0;
  let chunkIndex = 0;

  while (startPos < normalizedContent.length) {
    let endPos = Math.min(startPos + maxChunkSize, normalizedContent.length);

    // If we're not at the end and preserveParagraphs is enabled,
    // try to find a paragraph boundary (double newline or single newline)
    if (endPos < normalizedContent.length && preserveParagraphs) {
      const searchStart = Math.max(startPos, endPos - 500); // Look back up to 500 chars
      const searchText = normalizedContent.slice(searchStart, endPos);

      // Try to find paragraph break (double newline)
      let breakPos = searchText.lastIndexOf('\n\n');
      if (breakPos !== -1) {
        endPos = searchStart + breakPos + 2; // Include the newlines
      } else {
        // Fallback: find sentence break (period + space/newline)
        breakPos = searchText.lastIndexOf('. ');
        if (breakPos === -1) {
          breakPos = searchText.lastIndexOf('.\n');
        }
        if (breakPos !== -1) {
          endPos = searchStart + breakPos + 1; // Include the period
        } else {
          // Last resort: find any newline
          breakPos = searchText.lastIndexOf('\n');
          if (breakPos !== -1) {
            endPos = searchStart + breakPos + 1;
          }
        }
      }
    }

    // Extract chunk content
    const chunkContent = normalizedContent.slice(startPos, endPos).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        metadata: {
          startChar: startPos,
          endChar: endPos,
        },
      });
      chunkIndex++;
    }

    // Move to next chunk with overlap
    startPos = endPos - chunkOverlap;

    // Ensure we make progress (avoid infinite loop)
    if (startPos >= normalizedContent.length - chunkOverlap) {
      break;
    }
  }

  // Add total chunks count to each chunk's metadata
  const totalChunks = chunks.length;
  chunks.forEach((chunk) => {
    chunk.metadata.totalChunks = totalChunks;
  });

  return chunks;
}

/**
 * Estimate token count from character count
 * Approximation: 4 characters ≈ 1 token
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get chunk statistics
 */
export function getChunkStats(chunks: DocumentChunk[]): {
  totalChunks: number;
  avgChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  estimatedTokens: number;
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgChunkSize: 0,
      minChunkSize: 0,
      maxChunkSize: 0,
      estimatedTokens: 0,
    };
  }

  const sizes = chunks.map((c) => c.content.length);
  const totalSize = sizes.reduce((sum, size) => sum + size, 0);

  return {
    totalChunks: chunks.length,
    avgChunkSize: Math.round(totalSize / chunks.length),
    minChunkSize: Math.min(...sizes),
    maxChunkSize: Math.max(...sizes),
    estimatedTokens: estimateTokenCount(chunks.map((c) => c.content).join('')),
  };
}
