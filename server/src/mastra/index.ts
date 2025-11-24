import { getMastra } from '@/mastra/mastra-instance';
import { env } from '@config/env';
import { createExpressApp } from '@/express-app';
import { Mastra } from '@mastra/core';

const isMastraPlayground = env.MASTRA_START_SERVER;

let mastraInstance: Mastra | null = null;

// Conditionally start Express server when running in Mastra dev mode
// Uses a custom port (3001) to avoid conflict with Mastra playground
if (isMastraPlayground) {
  console.log('[Mastra] MASTRA_START_SERVER flag detected, starting Express server...');

  try {
    const app = await createExpressApp();

    // Use SERVER_PORT from environment (defaults to PORT if not set)
    const serverPort = env.SERVER_PORT;
    const baseUrl = env.BASE_URL;

    app.listen(serverPort, () => {
      console.log(`\n`);
      console.log(`[Express Server] Environment: ${env.NODE_ENV}`);
      console.log(`[Express Server] Port: ${serverPort}`);
      console.log(`[Express Server] API: ${baseUrl}/api`);
      console.log(`[Express Server] Health: ${baseUrl}/api/health`);
      console.log(`[Express Server] Files: ${baseUrl}/files`);
      console.log(`\n`);
    });

    console.log(`[Mastra] Express server started successfully on port ${serverPort} alongside Mastra playground`);
  } catch (error) {
    console.error('[Mastra] Failed to start Express server:', error);
    throw error;
  }

  mastraInstance = getMastra();
}


// noinspection JSUnusedGlobalSymbols
export const mastra = mastraInstance;
