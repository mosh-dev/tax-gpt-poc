import { MongoDBStore } from '@mastra/mongodb';
import { env } from '@config/env';

// Base MongoDB store for chat history (works with local MongoDB)
export const taxGptStorage = new MongoDBStore({
  id: 'tax-gpt-storage',
  url: env.MONGODB_URI,
  dbName: env.MONGODB_DB_NAME,
});
