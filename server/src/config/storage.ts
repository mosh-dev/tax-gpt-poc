/**
 * Storage Configuration
 * Centralized storage paths for file management
 */

// !!  IMPORTANT DO NOT LOCATION OF THIS storage.ts

import path, { join } from 'path';
import fs from 'fs';
import { getPathInfo } from '@utils/path-utils';

const { dirName } = getPathInfo(import.meta.url);
export const STORAGE_ROOT = join(dirName, '../../../storage');

// Storage subdirectories
export const STORAGE_PATHS = {
  files: path.join(STORAGE_ROOT, 'files'),  // All files (files and generated PDFs)
  temp: path.join(STORAGE_ROOT, 'temp'),
  tesseract: path.join(STORAGE_ROOT, 'tesseract-lang'),
  vectors: path.join(STORAGE_ROOT, 'vectors.db'),  // LibSQL vector database for semantic recall
  logs: path.join(STORAGE_ROOT, 'logs')
} as const;

ensureStorageDirectories();

/**
 * Get storage path for a specific type
 */
export function getStoragePath(type: keyof typeof STORAGE_PATHS): string {
  return STORAGE_PATHS[type];
}

/**
 * Ensure all storage directories exist
 * Creates them if they don't exist
 */
export function ensureStorageDirectories(): void {
  console.log('[Storage] Ensuring storage directories...');
  console.log('[Storage] STORAGE_ROOT:', STORAGE_ROOT);

  // Create root storage directory
  if (!fs.existsSync(STORAGE_ROOT)) {
    console.log('[Storage] Creating root storage directory:', STORAGE_ROOT);
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  } else {
    console.log('[Storage] Root storage directory already exists');
  }

  // Create subdirectories (except vectors.db which is a file)
  const directories = ['files', 'temp', 'tesseract', 'logs'] as const;

  for (const dir of directories) {
    const dirPath = STORAGE_PATHS[dir];
    if (!fs.existsSync(dirPath)) {
      console.log(`[Storage] Creating subdirectory: ${dir} at ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    } else {
      console.log(`[Storage] Subdirectory already exists: ${dir}`);
    }
  }

  console.log('[Storage] Storage directories setup complete');
}
