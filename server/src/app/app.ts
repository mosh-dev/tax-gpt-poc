import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { getStoragePath } from '@config/storage';
import { Environment } from '@config/environment';
import { initializeApp } from '@/app/initialize';
import { agentConfigRoutes } from '@api/routes/agent-config.routes';
import { authRoutes } from '@api/routes/auth.routes';
import { employeeRoutes } from '@api/routes/employee.routes';
import knowledgeRoutes from '@api/routes/knowledge.routes';
import { createFileRoutes } from '@api/routes/file.routes';
import { createConversationRoutes } from '@api/routes/conversation.routes';
import { createChatRoutes } from '@api/routes/chat.routes';
import { container } from '@/app/container-tsyringe';
import { ConversationController } from '@api/controllers/conversation.controller';
import { ChatController } from '@api/controllers/chat.controller';
import { FileController } from '@api/controllers/file.controller';
import { authMiddleware } from '@api/middleware/auth.middleware';
import { Mastra } from '@mastra/core';
import { workflowStorage } from '@/mastra/storage/workflow-storage';
import { taxCalculationWorkflow } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow';
import { PinoLogger } from '@mastra/loggers';
import { Observability } from '@mastra/observability';
import { setMastra } from '@/mastra/mastra-instance';
import { getOrCreateTaxAgent } from '@/mastra/agents/tax-agent/tax-agent.handler';
import { MAX_BODY_SIZE } from '@/shared/constants/file-upload';

/**
 * Create and configure Express application
 * Sets up middleware, routes, and error handlers
 */
export async function createExpressApp(): Promise<Express> {
  // Initialize database, seeds, and LLM client (idempotent)
  await initializeApp();
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
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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

  // Resolve controllers from DI container (all dependencies auto-injected!)
  const conversationController = container.resolve(ConversationController);
  const chatController = container.resolve(ChatController);
  const fileController = container.resolve(FileController);

  // Setup routes
  const conversationRoutes = createConversationRoutes(conversationController);
  const chatRoutes = createChatRoutes(chatController);
  const fileRoutes = createFileRoutes(fileController);

  // Mount public routes (no auth required)
  app.use('/api/auth', authRoutes);

  // Serve static files (no auth required for file downloads)
  const filesPath = getStoragePath('files');
  app.use('/files', express.static(filesPath));

  // Mount protected routes (auth required)
  app.use('/api/chat/conversations', authMiddleware, conversationRoutes);
  app.use('/api/chat', authMiddleware, chatRoutes);
  app.use('/api/files', authMiddleware, fileRoutes);
  app.use('/api/agent-config', authMiddleware, agentConfigRoutes);
  app.use('/api/employees', authMiddleware, employeeRoutes);
  app.use('/api/knowledge', knowledgeRoutes); // Knowledge routes have auth middleware built-in

  console.log('[Express Setup] Routes configured');

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
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

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
    try {
      const server = app.listen(Environment.SERVER_PORT, () => {
        console.log(`\n`);
        console.log(`[Express Server] Environment: ${Environment.NODE_ENV}`);
        console.log(`[Express Server] API: ${Environment.BASE_URL}/api`);
        console.log(`[Express Server] Health: ${Environment.BASE_URL}/api/health`);
        console.log(`[Express Server] Files: ${Environment.BASE_URL}/files\n`);
        resolve();
      });

      server.on('error', (error: Error) => {
        console.error('[Express Server] Failed to start:', error.message);
        reject(error);
      });
    } catch (error) {
      console.error('[Express Server] Error during startup:', error);
      reject(error);
    }
  });
}
