/**
 * MongoDB Database Configuration
 * Handles connection to MongoDB instance
 */

import mongoose from 'mongoose';
import { Environment } from '@config/environment';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

const MONGODB_URI = Environment.MONGODB_URI;

/**
 * Connect to MongoDB
 * Checks connection state and skips if already connected (naturally idempotent)
 */
export async function connectDatabase(): Promise<void> {
  const logger = injectFromContainer(LoggerService);
  if (isDatabaseConnected()) {
    logger.log('[Database] Already connected, skipping connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      bufferCommands: false, // Disable buffering to fail fast
    });
  } catch (error) {
    logger.error(error, '[Database] Connection failed:');
    throw error; // Throw to let caller handle the error
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  const logger = injectFromContainer(LoggerService);
  try {
    await mongoose.disconnect();
  } catch (error) {
    logger.error(error, '[Database] Disconnect failed:');
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Handle connection events
mongoose.connection.on('connected', () => {
  injectFromContainer(LoggerService).log('[Database] Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  injectFromContainer(LoggerService).error(err, '[Database] Mongoose connection error:');
});

mongoose.connection.on('disconnected', () => {
  injectFromContainer(LoggerService).log('[Database] Mongoose disconnected from MongoDB');
});

// Graceful shutdown
// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});
