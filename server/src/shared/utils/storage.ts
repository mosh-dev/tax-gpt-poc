/**
 * Storage Configuration
 * Centralized storage paths for file management
 */

import path from 'path';
import { getPathInfo } from '@shared/utils/path-utils';

const { __dirname: storageDir } = getPathInfo(import.meta.url);
export const STORAGE_ROOT = path.join(storageDir, '../../storage');

// Storage subdirectories
export const STORAGE_PATHS = {
  files: path.join(STORAGE_ROOT, 'files'),  // All files (files and generated PDFs)
  temp: path.join(STORAGE_ROOT, 'temp'),
  tesseract: path.join(STORAGE_ROOT, 'tesseract-lang'),
  vectors: path.join(STORAGE_ROOT, 'vectors.db'),  // LibSQL vector database for semantic recall
  logs: path.join(STORAGE_ROOT, 'logs')
} as const;

/**
 * Get storage path for a specific type
 */
export function getStoragePath(type: keyof typeof STORAGE_PATHS): string {
  return STORAGE_PATHS[type];
}

/**
 * Storage structure:
 *
 * storage/                      (Mount this as Docker volume)
 * ├── files/                    All files (uploads, generated PDFs, documents)
 * ├── temp/                     Temporary files (OCR processing, etc.)
 * ├── tesseract-lang/           Tesseract language training data
 * │   ├── eng.traineddata       English OCR model
 * │   └── deu.traineddata       German OCR model
 * └── vectors.db                LibSQL vector database for semantic recall
 */
