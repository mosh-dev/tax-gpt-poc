/**
 * Tax-GPT Server - Clean Architecture Entry Point
 * Uses Clean Architecture with DI container
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from './config/database';
import { getStoragePath } from './config/storage';
import { TaxAgent } from './agent';
import { initializeContainer } from './di';
import { createConversationRoutes, createChatRoutes, createFileRoutes } from './presentation/http/routes';
import { MastraAIAgentService, TesseractOCRService } from './infrastructure/services';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow any origin
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
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

  // Initialize DI container
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  const container = initializeContainer(baseUrl);

  console.log('[Setup] DI Container initialized');

  // Initialize Tax Agent (memory setup handled internally)
  const taxAgent = new TaxAgent();
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

  // Mount routes
  app.use('/api/chat/conversations', conversationRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/files', fileRoutes);

  console.log('[Setup] Routes configured');

  // Serve static files
  const filesPath = getStoragePath('files');
  app.use('/files', express.static(filesPath));

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      path: req.path
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
}

/**
 * Start server
 */
async function startServer() {
  try {
    await setupApplication();

    app.listen(PORT, () => {
      console.log(`\n[Tax-GPT] API Server is running (Clean Architecture)`);
      console.log(`[Server] Port: ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] API: http://localhost:${PORT}/api`);
      console.log(`[Server] Health: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Files: http://localhost:${PORT}/files`);
      console.log(`[Server] LMStudio: ${process.env.LMSTUDIO_URL || 'http://192.168.0.107:1234'}\n`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer();

export default app;
