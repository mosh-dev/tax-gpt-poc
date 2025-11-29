import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { getStoragePath } from '@config/storage';
import { Environment } from '@config/environment';
import { initializeApp } from '@/app/initialize';
import { agentConfigRoutes } from '@api/routes/agent-config.routes';
import { authRoutes } from '@api/routes/auth.routes';
import { employeeRoutes } from '@api/routes/employee.routes';
import { conversationRoutes } from '@api/routes/conversation.routes';
import { chatRoutes } from '@api/routes/chat.routes';
import { authMiddleware } from '@api/middleware/auth.middleware';
import { Mastra } from '@mastra/core';
import { workflowStorage } from '@/mastra/storage/workflow-storage';
import { taxCalculationWorkflow } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow';
import { PinoLogger } from '@mastra/loggers';
import { Observability } from '@mastra/observability';
import { setMastra } from '@/mastra/mastra-instance';
import { getOrCreateTaxAgent } from '@/mastra/agents/tax-agent/tax-agent.handler';
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
  await initializeApp();

  const logger = injectFromContainer(LoggerService);

  const taxAgentWrapper = await getOrCreateTaxAgent();
  const mastra = new Mastra({
    agents: { taxAgent: taxAgentWrapper.agent },
    storage: workflowStorage,
    workflows: {
      taxCalculation: taxCalculationWorkflow,
    },
    logger: new PinoLogger({
      name: 'Mastra',
      level: 'info',
    }),
    observability: new Observability({
      default: { enabled: true },
    }),
  });
  setMastra(mastra);


  const app: Express = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: MAX_BODY_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: MAX_BODY_SIZE }));

  // Request logging middleware
  app.use((req: Request, _: Response, next: NextFunction) => {
    logger.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'Tax-GPT server is running (Clean Architecture)',
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
  app.use('/api/knowledge', knowledgeRoutes);

  logger.log('[Express Setup] Routes configured');

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
        logger.log(`[Express Server] Environment: ${Environment.NODE_ENV}`);
        logger.log(`[Express Server] API: ${Environment.BASE_URL}/api`);
        logger.log(`[Express Server] Health: ${Environment.BASE_URL}/api/health`);
        logger.log(`[Express Server] Files: ${Environment.BASE_URL}/files\n`);
        resolve();
      });

      server.on('error', (error: Error) => {
        logger.error(error, `[Express Server] ${error.message}`);
        reject(error);
      });
    } catch (error) {
      logger.error(error, `[Express Server] Error during startup:`);
      reject(error);
    }
  });
}
