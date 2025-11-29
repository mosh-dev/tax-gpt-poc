import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { getStoragePath } from '@config/storage';
import { Environment } from '@config/environment';
import { initializeInfrastructure } from '@/app/initialize';
import { agentConfigRoutes } from '@api/routes/agent-config.routes';
import { authRoutes } from '@api/routes/auth.routes';
import { employeeRoutes } from '@api/routes/employee.routes';
import { conversationRoutes } from '@api/routes/conversation.routes';
import { chatRoutes } from '@api/routes/chat.routes';
import { authMiddleware } from '@api/middleware/auth.middleware';
import { MAX_BODY_SIZE } from '@/shared/constants/file-upload';
import { knowledgeRoutes } from '@api/routes/knowledge.routes';
import { fileRoutes } from '@api/routes/file.routes';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

/**
 * Create and configure Express application
 * Sets up middleware, routes, and error handlers
 */
export async function createExpressApp(): Promise<Express> {
  await initializeInfrastructure();

  const logger = injectFromContainer(LoggerService);
  const app: Express = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: MAX_BODY_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: MAX_BODY_SIZE }));

  // Request logging middleware
  app.use((req: Request, _: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'Tax-GPT server is running.',
      timestamp: new Date().toISOString()
    });
  });

  // Mount public routes (no auth required)
  app.use('/api/auth', authRoutes);

  // Serve static files (no auth required for file downloads)
  app.use('/files', express.static(getStoragePath('files')));

  // Mount protected routes (auth required)
  app.use('/api/chat/conversations', authMiddleware, conversationRoutes);
  app.use('/api/chat', authMiddleware, chatRoutes);
  app.use('/api/files', authMiddleware, fileRoutes);
  app.use('/api/agent-config', authMiddleware, agentConfigRoutes);
  app.use('/api/employees', authMiddleware, employeeRoutes);
  app.use('/api/knowledge', authMiddleware, knowledgeRoutes);

  logger.info('[Express Setup] Routes configured');

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      path: req.path
    });
  });

  // Global error handler
  app.use((err: Error, _: Request, res: Response) => {
    logger.error(err);

    res.status(500).json({
      error: 'Internal Server Error',
      message: Environment.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      ...(Environment.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}

/**
 * Start Express server on configured port
 */
export async function startExpressServer(app: Express): Promise<void> {
  return new Promise((resolve, reject) => {
    const logger = injectFromContainer(LoggerService);
    try {
      const server = app.listen(Environment.SERVER_PORT, () => {
        logger.info(`[Express Server] Environment: ${Environment.NODE_ENV}`);
        logger.info(`[Express Server] API: ${Environment.BASE_URL}/api`);
        logger.info(`[Express Server] Health: ${Environment.BASE_URL}/api/health`);
        resolve();
      });

      server.on('error', (error: Error) => {
        logger.error({ error }, `[Express Server] ${error.message}`);
        reject(error);
      });
    } catch (error) {
      logger.error({ error }, `[Express Server] Error during startup:`);
      reject(error);
    }
  });
}
