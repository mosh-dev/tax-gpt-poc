import { getMastra } from '@/mastra/mastra-instance';
import { createExpressApp, startExpressServer } from '@/app/app';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';


// !!!!!!!! IMPORTANT !!!!!!!!
// This file is used to start the Mastra playground.
// Do not add any other code here, Or Import anything from this file
// =================================================================

try {
  const app = await createExpressApp();
  await startExpressServer(app);
} catch (error: any) {
  const logger = injectFromContainer(LoggerService);
  logger.logException(error,'[Mastra] Failed to start Express server:');
  throw error;
}

// noinspection JSUnusedGlobalSymbols
export const mastra = getMastra();
