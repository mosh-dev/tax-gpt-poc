import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Allow all origins (for Docker/development flexibility)
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
    message: 'Tax-GPT server is running',
    timestamp: new Date().toISOString()
  });
});

// Import routes
import chatRoutes from './routes/chat';
import filesRoutes from './routes/files';

// Use routes
app.use('/api/chat', chatRoutes);
app.use('/api/files', filesRoutes);

// Serve all files for download
import * as path from 'path';
import { getStoragePath } from './config/storage';
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

// Start server
async function startServer() {
  // Connect to MongoDB
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`\n[Tax-GPT] API Server is running`);
    console.log(`[Server] Port: ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] API: http://localhost:${PORT}/api`);
    console.log(`[Server] Health: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Files: http://localhost:${PORT}/files`);
    console.log(`[Server] LMStudio: ${process.env.LMSTUDIO_URL || 'http://192.168.0.107:1234'}\n`);
  });
}

startServer();

export default app;
