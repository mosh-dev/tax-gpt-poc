/**
 * Storage Configuration
 * Centralized storage paths for file management
 */

import path from 'path';

// Base storage directory (all files go here for easy Docker volume mounting)
export const STORAGE_ROOT = path.join(__dirname, '../../storage');

// Storage subdirectories
export const STORAGE_PATHS = {
  uploads: path.join(STORAGE_ROOT, 'uploads'),
  pdfs: path.join(STORAGE_ROOT, 'pdfs'),
  temp: path.join(STORAGE_ROOT, 'temp'),
  tesseract: path.join(STORAGE_ROOT, 'tesseract-lang')
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
 * ├── uploads/                  User uploaded files (images, PDFs)
 * ├── pdfs/                     Generated tax PDF documents
 * ├── temp/                     Temporary files (OCR processing, etc.)
 * └── tesseract-lang/          Tesseract language training data
 *     ├── eng.traineddata       English OCR model
 *     └── deu.traineddata       German OCR model
 */
