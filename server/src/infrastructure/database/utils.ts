/**
 * Database Utilities
 * Central source for MongoDB/Mongoose operations
 */

import mongoose from 'mongoose';

/**
 * Get MongoDB database connection
 */
export function getDatabase(): mongoose.Connection['db'] | null {
  if (!mongoose.connection.db) {
    console.warn('[Database] MongoDB connection not available');
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
