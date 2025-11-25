/**
 * Tax-GPT Server - Clean Architecture Entry Point
 * Uses Clean Architecture with DI container
 */

import { env } from '@/env';
import { getErrorMessage } from '@utils/error-handler';
import { createExpressApp, startExpressServer } from '@/express-app';

/**
 * Start server
 */
async function startServer() {
  try {
    const app = await createExpressApp();
    await startExpressServer(app);
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[Server] Failed to start:', errorMsg);
    process.exit(1);
  }
}

/**
 * Global error handlers for unhandled errors
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Process] Unhandled Promise Rejection:', reason);
  console.error('[Process] Promise:', promise);
  // Don't exit in production, just log the error
  if (env.NODE_ENV === 'development') {
    console.error('[Process] Full error:', reason?.stack || reason);
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('[Process] Uncaught Exception:', error.message);
  console.error('[Process] Stack:', error.stack);
  // In production, gracefully shutdown
  if (env.NODE_ENV === 'production') {
    console.error('[Process] Shutting down due to uncaught exception');
    process.exit(1);
  }
});

await startServer();
