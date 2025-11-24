/**
 * MongoDB Database Configuration
 * Handles connection to MongoDB instance
 */

import mongoose from 'mongoose';
import { env } from './env';

const MONGODB_URI = env.MONGODB_URI;

/**
 * Connect to MongoDB
 * Checks connection state and skips if already connected (naturally idempotent)
 */
export async function connectDatabase(): Promise<void> {
  // Check if already connected via Mongoose connection state
  if (isDatabaseConnected()) {
    console.log('[Database] Already connected, skipping connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      bufferCommands: false, // Disable buffering to fail fast
    });
    console.log('[Database] Connection successful');
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    console.error(`[Database] Make sure MongoDB is running at ${MONGODB_URI}`);
    // Don't exit process, allow server to run without DB for now
    console.warn('[Database] Server will continue without database features');
    throw error; // Throw to let caller handle the error
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
// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});
