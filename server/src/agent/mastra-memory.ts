/**
 * Mastra Memory Configuration
 * - MongoDB: Chat history storage (local or remote)
 * - LibSQL: Vector embeddings for semantic recall (local SQLite file)
 */

import { Memory } from '@mastra/memory';
import { MongoDBStore } from '@mastra/mongodb';
import { LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { STORAGE_PATHS } from '../config/storage';

/**
 * Memory configuration options
 */
export interface MemoryConfig {
  /** MongoDB URI for storage (can be local) */
  mongoUri: string;
  /** Database name */
  dbName: string;
  /** Enable vector embeddings with LibSQL */
  enableVectorStorage: boolean;
}

/**
 * Create Mastra Memory instance with MongoDB storage and LibSQL vector search
 * MongoDB for chat history, LibSQL for vector embeddings (local file)
 */
export function createMastraMemory(config: MemoryConfig): Memory {
  console.log('[Mastra Memory] Initializing memory system...');
  console.log(`[Mastra Memory] Vector storage: ${config.enableVectorStorage ? 'enabled (LibSQL)' : 'disabled'}`);

  // Base MongoDB store for chat history (works with local MongoDB)
  const storage = new MongoDBStore({
    id: 'tax-gpt-storage',
    url: config.mongoUri,
    dbName: config.dbName,
  });

  // Vector storage with LibSQL (local SQLite file)
  if (config.enableVectorStorage) {
    const vectorDbPath = 'file:' + STORAGE_PATHS.vectors;
    console.log(`[Mastra Memory] Setting up LibSQL vector storage at: ${vectorDbPath}`);

    const vector = new LibSQLVector({
      id: 'tax-gpt-vector',
      connectionUrl: vectorDbPath,
    });

    return new Memory({
      storage: storage,
      vector,
      embedder: fastembed,
      options: {
        lastMessages: 10, // Keep last 10 messages in context
        semanticRecall: {
          topK: 3, // Retrieve top 3 semantically similar messages
          messageRange: 2, // Include 2 neighboring messages around each match
        },
      },
    });
  }

  // Basic memory without vector storage
  console.log('[Mastra Memory] Using basic memory (no vector storage)');
  console.log('[Mastra Memory] Semantic recall is disabled');

  return new Memory({
    storage: storage,
    options: {
      lastMessages: 10, // Keep last 10 messages in context
    },
  });
}

/**
 * Create memory configuration from environment variables
 */
export function createMemoryConfigFromEnv(): MemoryConfig {
  // Import env here to avoid circular dependency
  const { env } = require('../config/env');

  const mongoUri = env.MONGODB_URI;
  const dbName = env.MONGODB_DB_NAME;

  // Enable vector storage by default with LibSQL
  const vectorDisabled = env.DISABLE_VECTOR_STORAGE === 'true';

  return {
    mongoUri,
    dbName,
    enableVectorStorage : !vectorDisabled,
  };
}
