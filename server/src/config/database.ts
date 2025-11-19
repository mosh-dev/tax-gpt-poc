/**
 * MongoDB Database Configuration
 * Handles connection to MongoDB instance
 */

import mongoose from 'mongoose';
import { env } from './env';

const MONGODB_URI = env.MONGODB_URI;

/**
 * Connect to MongoDB
 */
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    console.error(`[Database] Make sure MongoDB is running at ${MONGODB_URI}`);
    // Don't exit process, allow server to run without DB for now
    console.warn('[Database] Server will continue without database features');
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('[Database] Disconnected from MongoDB');
  } catch (error) {
    console.error('[Database] Disconnect failed:', error);
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
  console.log('[Database] Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[Database] Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});
