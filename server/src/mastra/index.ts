import { getMastra } from '@/mastra/mastra-instance';
import { Environment } from '@/environment';
import { createExpressApp, startExpressServer } from '@/express-app';
import { Mastra } from '@mastra/core';

const isMastraPlayground = Environment.MASTRA_START_SERVER;

let mastraInstance: Mastra | null = null;

// Conditionally start Express server when running in Mastra dev mode
// Uses a custom port (3001) to avoid conflict with Mastra playground
if (isMastraPlayground) {
  console.log('[Mastra] MASTRA_START_SERVER flag detected, starting Express server...');
  try {
    const app = await createExpressApp();
    await startExpressServer(app);
  } catch (error) {
    console.error('[Mastra] Failed to start Express server:', error);
    throw error;
  }
  mastraInstance = getMastra();
}


// noinspection JSUnusedGlobalSymbols
export const mastra = mastraInstance;
