/**
 * Tax-GPT Server - Clean Architecture Entry Point
 * Uses Clean Architecture with DI container
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDatabase } from '@config/database';
import { getStoragePath } from '@config/storage';
import { env } from '@config/env';
// import { initializeLLMClient } from '@config/llm';
import { runAllSeeds } from '@/seeds/run-seed';
import { getErrorMessage } from '@utils/error-handler';
import { workflowRoutes } from '@api/routes/workflow.routes';
import { agentConfigRoutes } from '@api/routes/agent-config.routes';
import { authRoutes } from '@api/routes/auth.routes';
import { employeeRoutes } from '@api/routes/employee.routes';
import knowledgeRoutes from '@api/routes/knowledge.routes';
import { createFileRoutes } from '@api/routes/file.routes';
import { createConversationRoutes } from '@api/routes/conversation.routes';
import { initializeTaxAgent } from '@agent/setup';
import { createChatRoutes } from '@api/routes/chat.routes';
import { initializeContainer } from '@/di/container';
import { MastraAIAgentService } from '@infrastructure/services/ai/MastraAIAgentService';
import { TesseractOCRService } from '@infrastructure/services/ocr/TesseractOCRService';
import { authMiddleware } from '@api/middleware/auth.middleware';
import { initializeLLMClient } from '@config/llm';

const app: Express = express();

// Middleware
app.use(cors({
  origin: true, // Allow any origin
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

/**
 * Initialize and wire dependencies
 */
async function setupApplication() {
  // Connect to MongoDB
  await connectDatabase();

  // Run seed scripts
  await runAllSeeds();

  // Initialize LLM client with API key from database
  await initializeLLMClient();

  // Initialize DI container
  const container = initializeContainer(env.BASE_URL);

  console.log('[Setup] DI Container initialized');

  // Initialize Tax Agent with instructions from database
  await initializeTaxAgent();
  const aiAgentService = new MastraAIAgentService();
  container.setAIAgentService(aiAgentService);
  console.log('[Setup] AI Agent Service initialized');

  // Wire OCR service
  const ocrService = new TesseractOCRService();
  container.setOCRService(ocrService);
  console.log('[Setup] OCR Service initialized');

  // Setup routes
  const conversationRoutes = createConversationRoutes(container.conversationController);
  const chatRoutes = container.chatController
    ? createChatRoutes(container.chatController)
    : express.Router();
  const fileRoutes = container.fileController
    ? createFileRoutes(container.fileController)
    : express.Router();

  // Mount public routes (no auth required)
  app.use('/api/auth', authRoutes);

  // Serve static files (no auth required for file downloads)
  const filesPath = getStoragePath('files');
  app.use('/files', express.static(filesPath));

  // Mount protected routes (auth required)
  app.use('/api/chat/conversations', authMiddleware, conversationRoutes);
  app.use('/api/chat', authMiddleware, chatRoutes);
  app.use('/api/files', authMiddleware, fileRoutes);
  app.use('/api/workflows', authMiddleware, workflowRoutes);
  app.use('/api/agent-config', authMiddleware, agentConfigRoutes);
  app.use('/api/employees', authMiddleware, employeeRoutes);
  app.use('/api/knowledge', knowledgeRoutes); // Knowledge routes have auth middleware built-in

  console.log('[Setup] Routes configured');

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      path: req.path
    });
  });

  // Global error handler
  app.use((err: Error, _: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    res.status(500).json({
      error: 'Internal Server Error',
      message: env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      ...(env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
}

/**
 * Start server
 */
async function startServer() {
  try {
    await setupApplication();

    app.listen(env.PORT, () => {
      console.log(`\n`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
      console.log(`[Server] API: ${env.BASE_URL}/api`);
      console.log(`[Server] Health: ${env.BASE_URL}/api/health`);
      console.log(`[Server] Files: ${env.BASE_URL}/files\n`);
    });
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

// noinspection JSUnusedGlobalSymbols
export default app;
