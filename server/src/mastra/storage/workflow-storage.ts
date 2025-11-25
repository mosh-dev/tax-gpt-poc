// Create MongoDB storage for workflow snapshots
import { MongoDBStore } from '@mastra/mongodb';
import { env } from '@/env';

export const workflowStorage = new MongoDBStore({
  id: 'tax-gpt-workflow-storage',
  url: env.MONGODB_URI,
  dbName: env.MONGODB_DB_NAME,
});
