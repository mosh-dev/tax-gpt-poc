import { MongoDBStore } from '@mastra/mongodb';
import { Environment } from '@config/environment';

// Base MongoDB store for chat history (works with local MongoDB)
export const taxGptStorage = new MongoDBStore({
  id: 'tax-gpt-storage',
  url: Environment.MONGODB_URI,
  dbName: Environment.MONGODB_DB_NAME,
});
