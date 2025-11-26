/**
 * RAG Service Types
 * Type definitions for RAG operations
 */

export interface IngestResult {
  fileId: string;
  fileName: string;
  chunkCount: number;
  vectorIds: string[];
  stats: {
    totalChunks: number;
    avgChunkSize: number;
    estimatedTokens: number;
  };
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  fileId?: string;
}