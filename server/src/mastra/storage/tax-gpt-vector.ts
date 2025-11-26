import { STORAGE_PATHS } from '@config/storage';
import { LibSQLVector } from '@mastra/libsql';

const vectorDbPath = 'file:' + STORAGE_PATHS.vectors;
console.log(`[Mastra Memory] Setting up LibSQL vector storage at: ${vectorDbPath}`);

export const taxGptVector = new LibSQLVector({
  id: 'tax-gpt-vector',
  connectionUrl: vectorDbPath,
});
