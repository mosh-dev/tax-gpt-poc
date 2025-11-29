import { getMastra } from '@/mastra/mastra-instance';
import { createExpressApp, startExpressServer } from '@/app/app';
import { pinoServerLogger } from '@utils/pino-logger';

// !!!!!!!! IMPORTANT !!!!!!!!
// This file is used to start the Mastra playground.
// Do not add any other code here, Or Import anything from this file
// =================================================================

try {
  const app = await createExpressApp();
  await startExpressServer(app);
} catch (error) {
  pinoServerLogger.error({ error }, '[Mastra] Failed to start Express server');
  throw error;
}

// noinspection JSUnusedGlobalSymbols
export const mastra = getMastra();
