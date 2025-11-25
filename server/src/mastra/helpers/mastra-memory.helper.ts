import { Memory } from '@mastra/memory';
import { fastembed } from '@mastra/fastembed';
import { env } from '@infrastructure/llm/env';
import { taxGptStorage } from '@/mastra/storage/tax-gpt-storage';
import { taxGptVector } from '@/mastra/storage/tax-gpt-vector';

interface MemoryConfig {
  mongoUri: string;
  dbName: string;
  enableVectorStorage: boolean;
}

/**
 * Create Mastra Memory instance with MongoDB storage and LibSQL vector search
 * MongoDB for chat history, LibSQL for vector embeddings (local file)
 */
export function createMastraMemory(config: MemoryConfig): Memory {
  const lastMessages = 10;
  const topK = 5; // Retrieve top 3 semantically similar messages
  const messageRange = 3; // Include 2 neighboring messages around each match

  if (config.enableVectorStorage) {
    return new Memory({
      storage: taxGptStorage,
      vector: taxGptVector,
      embedder: fastembed,
      options: {
        lastMessages,
        semanticRecall: {
          topK,
          messageRange,
        },
      },
    });
  }

  return new Memory({
    storage: taxGptStorage,
    options: {
      lastMessages,
    },
  });
}

/**
 * Create memory configuration from environment variables
 */
export function createMemoryConfigFromEnv(): MemoryConfig {
  return {
    mongoUri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
    enableVectorStorage: !env.DISABLE_VECTOR_STORAGE,
  };
}
