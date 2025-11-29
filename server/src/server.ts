import { Environment } from '@config/environment';
import { getErrorMessage } from '@utils/error-handler';
import { createExpressApp, startExpressServer } from '@/app/app';
import { pinoServerLogger } from '@utils/pino-logger';

/**
 * Start server
 */
async function startServer() {
  try {
    const app = await createExpressApp();
    await startExpressServer(app);
  } catch (error) {
    pinoServerLogger.error(error);
    console.error('[Server] Failed to start:', getErrorMessage(error));
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
  if (Environment.NODE_ENV === 'development') {
    console.error('[Process] Full error:', reason?.stack || reason);
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('[Process] Uncaught Exception:', error.message);
  console.error('[Process] Stack:', error.stack);
  // In production, gracefully shutdown
  if (Environment.NODE_ENV === 'production') {
    console.error('[Process] Shutting down due to uncaught exception');
    process.exit(1);
  }
});

await startServer();
