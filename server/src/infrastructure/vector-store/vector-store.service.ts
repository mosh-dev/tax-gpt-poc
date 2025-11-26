/**
 * Vector Store Service
 * Persistent vector storage using LibSQL
 */
import { injectable } from 'tsyringe';

import { LibSQLVector } from '@mastra/libsql';
import { STORAGE_PATHS } from '@config/storage';
import { generateEmbedding } from '@infrastructure/embedding/embedding.service';
import { getErrorMessage } from '@utils/error-handler';
import type { VectorDocument, SearchResult } from './vector-store.types';

export type { VectorDocument, SearchResult };

/**
 * Vector Store Service
 * Uses LibSQL for persistent vector storage
 */
@injectable()
export class VectorStoreService {
  private vector: LibSQLVector;
  private initialized: boolean = false;
  private readonly indexName = 'knowledge_base';
  private readonly dimension = 384; // FastEmbed default dimension

  constructor() {
    const vectorDbPath = 'file:' + STORAGE_PATHS.vectors;
    console.log('[VectorStore] Initializing LibSQL vector store at:', vectorDbPath);

    this.vector = new LibSQLVector({
      id: 'knowledge-base-vectors',
      connectionUrl: vectorDbPath,
    });
  }

  /**
   * Initialize vector store (create index if needed)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Try to create index (will skip if already exists)
      try {
        await this.vector.createIndex({
          indexName: this.indexName,
          dimension: this.dimension,
          metric: 'cosine',
        });
        console.log('[VectorStore] Created new vector index');
      } catch (error: unknown) {
        // Index might already exist, that's okay
        const errorMsg = getErrorMessage(error);
        if (errorMsg.includes('already exists')) {
          console.log('[VectorStore] Using existing vector index');
        } else {
          console.warn('[VectorStore] Index creation warning:', errorMsg);
        }
      }

      this.initialized = true;
      console.log('[VectorStore] Vector store initialized successfully');
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[VectorStore] Failed to initialize:', errorMsg);
      throw error;
    }
  }

  /**
   * Store multiple vector documents in batch
   */
  async storeDocuments(docs: VectorDocument[]): Promise<void> {
    await this.initialize();

    if (docs.length === 0) {
      return;
    }

    try {
      const vectors = docs.map(doc => doc.embedding);
      const metadata = docs.map(doc => ({
        id: doc.id,
        content: doc.content,
        fileId: doc.metadata.fileId,
        fileName: doc.metadata.fileName,
        chunkIndex: doc.metadata.chunkIndex,
        totalChunks: doc.metadata.totalChunks,
      }));
      const ids = docs.map(doc => doc.id);

      await this.vector.upsert({
        indexName: this.indexName,
        vectors,
        metadata,
        ids,
      });

      console.log(`[VectorStore] Stored ${docs.length} documents in LibSQL`);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[VectorStore] Error storing documents:', errorMsg);
      throw new Error(`Failed to store documents: ${errorMsg}`);
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async search(
    query: string,
    options: {
      topK?: number;
      minScore?: number;
      fileId?: string; // Optional: filter by specific file
    } = {}
  ): Promise<SearchResult[]> {
    await this.initialize();

    const { topK = 5, minScore = 0.5, fileId } = options;

    try {
      // Generate embedding for query
      const { embedding: queryEmbedding } = await generateEmbedding(query);

      // Build filter if fileId specified
      const filter = fileId ? { fileId } : undefined;

      // Query LibSQL vector store
      const results = await this.vector.query({
        indexName: this.indexName,
        queryVector: queryEmbedding,
        topK,
        filter,
        includeVector: false,
        minScore,
      });

      // Transform to SearchResult format
      const searchResults: SearchResult[] = results.map((result: any) => ({
        id: result.id || result.metadata?.id || '',
        content: result.metadata?.content || '',
        score: result.score || 0,
        metadata: {
          fileId: result.metadata?.fileId || '',
          fileName: result.metadata?.fileName || '',
          chunkIndex: result.metadata?.chunkIndex || 0,
          totalChunks: result.metadata?.totalChunks || 0,
        },
      }));

      console.log(`[VectorStore] Search returned ${searchResults.length} results (topK: ${topK}, minScore: ${minScore})`);

      return searchResults;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[VectorStore] Error searching:', errorMsg);
      // If query fails, return empty results instead of throwing
      console.warn('[VectorStore] Returning empty results due to search error');
      return [];
    }
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    await this.initialize();

    if (ids.length === 0) {
      return;
    }

    try {
      for (const id of ids) {
        await this.vector.deleteVector({
          indexName: this.indexName,
          id,
        });
      }
      console.log(`[VectorStore] Deleted ${ids.length} documents from LibSQL`);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[VectorStore] Error deleting documents:', errorMsg);
    }
  }

  /**
   * Delete all documents for a specific file
   */
  async deleteByFileId(fileId: string): Promise<void> {
    await this.initialize();

    try {
      // Query to find all vectors for this file
      // We'll use a dummy query to get all results with the fileId filter
      const dummyVector = new Array(this.dimension).fill(0);

      const results = await this.vector.query({
        indexName: this.indexName,
        queryVector: dummyVector,
        topK: 10000, // Large number to get all
        filter: { fileId },
        includeVector: false,
      });

      // Delete all found vectors
      const ids = results.map((r: any) => r.id || r.metadata?.id).filter(Boolean);

      if (ids.length > 0) {
        await this.deleteDocuments(ids);
        console.log(`[VectorStore] Deleted ${ids.length} documents for file ${fileId}`);
      } else {
        console.log(`[VectorStore] No documents found for file ${fileId}`);
      }
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[VectorStore] Error deleting by fileId:', errorMsg);
      throw new Error(`Failed to delete documents for file ${fileId}: ${errorMsg}`);
    }
  }
}

// Export singleton instance
export const vectorStoreService = new VectorStoreService();
