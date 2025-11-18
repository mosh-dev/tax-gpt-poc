/**
 * Mastra Memory Configuration
 * Configures MongoDB storage and optional vector embeddings for agent memory
 */

import { Memory } from '@mastra/memory';
import { MongoDBStore, MongoDBVector } from '@mastra/mongodb';
import { fastembed } from '@mastra/fastembed';

/**
 * Memory configuration options
 */
export interface MemoryConfig {
  /** MongoDB URI for storage (can be local) */
  mongoUri: string;
  /** Database name */
  dbName: string;
  /** MongoDB Atlas URI for vector storage (optional, requires Atlas) */
  mongoAtlasUri?: string;
  /** Enable vector embeddings (requires Atlas) */
  enableVectorStorage: boolean;
}

/**
 * Create Mastra Memory instance with MongoDB storage
 * Supports both local MongoDB (storage only) and MongoDB Atlas (storage + vectors)
 */
export function createMastraMemory(config: MemoryConfig): Memory {
  console.log('[Mastra Memory] Initializing memory system...');
  console.log(`[Mastra Memory] MongoDB URI: ${config.mongoUri}`);
  console.log(`[Mastra Memory] Database: ${config.dbName}`);
  console.log(`[Mastra Memory] Vector storage: ${config.enableVectorStorage ? 'enabled' : 'disabled'}`);

  // Base MongoDB store (works with local MongoDB)
  const storage = new MongoDBStore({
    id: 'tax-gpt-storage',
    url: config.mongoUri,
    dbName: config.dbName,
  });

  // Vector storage and embeddings (requires MongoDB Atlas)
  if (config.enableVectorStorage && config.mongoAtlasUri) {
    console.log('[Mastra Memory] Setting up vector storage with MongoDB Atlas');

    const vector = new MongoDBVector({
      id: 'tax-gpt-vector',
      uri: config.mongoAtlasUri,
      dbName: config.dbName,
    });

    return new Memory({
      storage: storage as any, // Type assertion for beta package compatibility
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

  // Basic memory without vector storage (works with local MongoDB)
  console.log('[Mastra Memory] Using basic memory (no vector storage)');
  console.log('[Mastra Memory] To enable semantic recall, configure MONGODB_ATLAS_URI in .env');

  return new Memory({
    storage: storage as any, // Type assertion for beta package compatibility
  });
}

/**
 * Create memory configuration from environment variables
 */
export function createMemoryConfigFromEnv(): MemoryConfig {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tax-gpt';
  const dbName = process.env.MONGODB_DB_NAME || 'tax-gpt';
  const mongoAtlasUri = process.env.MONGODB_ATLAS_URI;
  const enableVectorStorage = !!mongoAtlasUri;

  return {
    mongoUri,
    dbName,
    mongoAtlasUri,
    enableVectorStorage,
  };
}
