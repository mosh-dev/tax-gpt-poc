import { Environment } from '@config/environment';
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
    pinoServerLogger.error({ error }, `[Server] Failed to start`);
    process.exit(1);
  }
}

/**
 * Global error handlers for unhandled errors
 */
process.on('unhandledRejection', (...args) => {
  pinoServerLogger.error(args, '[Process] Unhandled Rejection');
  if (Environment.NODE_ENV === 'development') {
    pinoServerLogger.error('[Process] Full error');
  }
});

process.on('uncaughtException', (error: Error) => {
  pinoServerLogger.error({ error }, '[Process] Uncaught Exception');
  // In production, gracefully shutdown
  if (Environment.NODE_ENV === 'production') {
    pinoServerLogger.error('[Process] Shutting down due to uncaught exception');
    process.exit(1);
  }
});

await startServer();
