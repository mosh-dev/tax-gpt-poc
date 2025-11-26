// Create MongoDB storage for workflow snapshots
import { MongoDBStore } from '@mastra/mongodb';
import { Environment } from '@config/environment';

export const workflowStorage = new MongoDBStore({
  id: 'tax-gpt-workflow-storage',
  url: Environment.MONGODB_URI,
  dbName: Environment.MONGODB_DB_NAME,
});
