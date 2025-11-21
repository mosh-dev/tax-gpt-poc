/**
 * RAG Service
 * Main service for knowledge base ingestion and retrieval
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { KnowledgeBase } from '../../models/knowledge-base.model';
import { chunkDocument, getChunkStats, DocumentChunk } from './chunker';
import { generateEmbeddings } from './embedder';
import { getVectorStore, VectorDocument, SearchResult } from './retriever';

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

/**
 * RAG Service for knowledge base management
 */
export class RAGService {
  private vectorStore = getVectorStore();

  /**
   * Ingest a knowledge base file (txt, md, pdf)
   */
  async ingestFile(filePath: string, metadata: {
    fileId: string;
    fileName: string;
    fileType: 'txt' | 'md' | 'pdf';
    size: number;
  }): Promise<IngestResult> {
    console.log(`[RAG] Ingesting file: ${metadata.fileName} (${metadata.fileType})`);

    try {
      // Step 1: Extract text content based on file type
      const content = await this.extractTextContent(filePath, metadata.fileType);

      if (!content || content.trim().length === 0) {
        throw new Error('Extracted content is empty');
      }

      console.log(`[RAG] Extracted ${content.length} characters from ${metadata.fileName}`);

      // Step 2: Chunk the document
      const chunks = chunkDocument(content);

      if (chunks.length === 0) {
        throw new Error('No chunks created from document');
      }

      const stats = getChunkStats(chunks);
      console.log(`[RAG] Created ${chunks.length} chunks (avg size: ${stats.avgChunkSize} chars)`);

      // Step 3: Generate embeddings for all chunks
      const chunkTexts = chunks.map((chunk) => chunk.content);
      const embeddings = await generateEmbeddings(chunkTexts);

      if (embeddings.length !== chunks.length) {
        throw new Error('Mismatch between chunks and embeddings count');
      }

      console.log(`[RAG] Generated ${embeddings.length} embeddings`);

      // Step 4: Prepare vector documents
      const vectorDocs: VectorDocument[] = chunks.map((chunk, index) => ({
        id: uuidv4(),
        content: chunk.content,
        embedding: embeddings[index].embedding,
        metadata: {
          fileId: metadata.fileId,
          fileName: metadata.fileName,
          chunkIndex: index,
          totalChunks: chunks.length,
          startChar: chunk.metadata.startChar,
          endChar: chunk.metadata.endChar,
        },
      }));

      // Step 5: Store vectors in LibSQL
      await this.vectorStore.storeDocuments(vectorDocs);

      const vectorIds = vectorDocs.map((doc) => doc.id);

      console.log(`[RAG] Stored ${vectorIds.length} vectors in database`);

      // Step 6: Save metadata to MongoDB
      await KnowledgeBase.create({
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        fileType: metadata.fileType,
        storedPath: filePath,
        size: metadata.size,
        chunkCount: chunks.length,
        vectorIds,
        content: content.substring(0, 10000), // Store first 10K chars for preview
        uploadedAt: new Date(),
      });

      console.log(`[RAG] Saved metadata to MongoDB for ${metadata.fileName}`);

      return {
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        chunkCount: chunks.length,
        vectorIds,
        stats: {
          totalChunks: stats.totalChunks,
          avgChunkSize: stats.avgChunkSize,
          estimatedTokens: stats.estimatedTokens,
        },
      };
    } catch (error) {
      console.error('[RAG] Error ingesting file:', error);
      throw new Error(`Failed to ingest file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search knowledge base
   */
  async searchKnowledge(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    console.log(`[RAG] Searching for: "${query.substring(0, 50)}..."`);

    try {
      const results = await this.vectorStore.search(query, {
        topK: options.topK || 5,
        minScore: options.minScore || 0.5,
        fileId: options.fileId,
      });

      console.log(`[RAG] Search returned ${results.length} results`);

      return results;
    } catch (error) {
      console.error('[RAG] Error searching knowledge base:', error);
      throw new Error(`Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a knowledge base file and all its vectors
   */
  async deleteFile(fileId: string): Promise<void> {
    console.log(`[RAG] Deleting file: ${fileId}`);

    try {
      // Find the file metadata
      const kbFile = await KnowledgeBase.findOne({ fileId });

      if (!kbFile) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Delete vectors from LibSQL
      await this.vectorStore.deleteByFileId(fileId);

      // Delete file from disk
      try {
        await fs.unlink(kbFile.storedPath);
        console.log(`[RAG] Deleted file from disk: ${kbFile.storedPath}`);
      } catch (error) {
        console.warn(`[RAG] Could not delete file from disk:`, error);
      }

      // Delete metadata from MongoDB
      await KnowledgeBase.deleteOne({ fileId });

      console.log(`[RAG] Successfully deleted file: ${fileId}`);
    } catch (error) {
      console.error('[RAG] Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all knowledge base files
   */
  async listFiles(): Promise<Array<{
    fileId: string;
    fileName: string;
    fileType: string;
    size: number;
    chunkCount: number;
    uploadedAt: Date;
  }>> {
    try {
      const files = await KnowledgeBase.find({})
        .select('fileId fileName fileType size chunkCount uploadedAt')
        .sort({ uploadedAt: -1 })
        .lean();

      return files.map((file) => ({
        fileId: file.fileId,
        fileName: file.fileName,
        fileType: file.fileType,
        size: file.size,
        chunkCount: file.chunkCount,
        uploadedAt: file.uploadedAt,
      }));
    } catch (error) {
      console.error('[RAG] Error listing files:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from different file types
   */
  private async extractTextContent(
    filePath: string,
    fileType: 'txt' | 'md' | 'pdf'
  ): Promise<string> {
    try {
      if (fileType === 'txt' || fileType === 'md') {
        // Read text files directly
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
      } else if (fileType === 'pdf') {
        // Use pdf-parse for PDFs
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        return pdfData.text;
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('[RAG] Error extracting text:', error);
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
let ragServiceInstance: RAGService | null = null;

/**
 * Get singleton RAG service instance
 */
export function getRAGService(): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService();
  }
  return ragServiceInstance;
}
