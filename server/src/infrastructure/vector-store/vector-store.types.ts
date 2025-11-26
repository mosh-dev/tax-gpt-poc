/**
 * Vector Store Types
 * Type definitions for vector storage operations
 */

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    fileId: string;
    fileName: string;
    chunkIndex: number;
    totalChunks: number;
    [key: string]: any;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  score: number; // Similarity score (higher is better)
  metadata: VectorDocument['metadata'];
}