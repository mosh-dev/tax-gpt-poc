/**
 * Database Utilities
 * Central source for MongoDB/Mongoose operations
 */

import mongoose from 'mongoose';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

/**
 * Get MongoDB database connection
 */
export function getDatabase(): mongoose.Connection['db'] | null {
  const logger = injectFromContainer(LoggerService);
  if (!mongoose.connection.db) {
    logger.warn('[Database] MongoDB connection not available');
    return null;
  }
  return mongoose.connection.db;
}

/**
 * Get a MongoDB collection
 */
export function getCollection(collectionName: string) {
  const db = getDatabase();
  if (!db) {
    return null;
  }
  return db.collection(collectionName);
}

/**
 * Export mongoose for consistent imports
 */
export { mongoose };
