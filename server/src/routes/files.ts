/**
 * File Storage Routes
 * Handles file uploads without immediate OCR processing
 * Files are stored with unique IDs and processed later by AI agent tools
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { getStoragePath } from '../config/storage';

const router = Router();

// In-memory store for file metadata (in production, use Redis or database)
const fileStore = new Map<string, FileMetadata>();

interface FileMetadata {
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  processed: boolean;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = getStoragePath('uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with UUID
    const fileId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const allowedTypes = /jpeg|jpg|png|bmp|tiff|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPG, PNG, BMP, TIFF, WebP) and PDF files are allowed'));
  }
});

/**
 * POST /api/files/upload
 * Upload files and get unique IDs (no OCR processing yet)
 */
router.post('/upload', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles: FileMetadata[] = [];

    for (const file of files) {
      // Generate unique ID (use filename without extension)
      const fileId = path.basename(file.filename, path.extname(file.filename));

      const metadata: FileMetadata = {
        id: fileId,
        originalName: file.originalname,
        storedPath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        processed: false
      };

      // Store metadata
      fileStore.set(fileId, metadata);
      uploadedFiles.push(metadata);

      console.log(`[Files] Uploaded file: ${file.originalname} (ID: ${fileId}, ${file.size} bytes)`);
    }

    res.json({
      success: true,
      count: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        id: f.id,
        name: f.originalName,
        size: f.size,
        type: f.mimeType,
        uploadedAt: f.uploadedAt
      }))
    });

  } catch (error) {
    console.error('File upload error:', error);

    // Clean up files if they exist
    const files = req.files as Express.Multer.File[];
    if (files) {
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    res.status(500).json({
      error: 'Failed to upload files',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/files/:id
 * Get file metadata by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const fileId = req.params.id;
  const metadata = fileStore.get(fileId);

  if (!metadata) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.json({
    id: metadata.id,
    name: metadata.originalName,
    size: metadata.size,
    type: metadata.mimeType,
    uploadedAt: metadata.uploadedAt,
    processed: metadata.processed
  });
});

/**
 * DELETE /api/files/:id
 * Delete file by ID
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const metadata = fileStore.get(fileId);

  if (!metadata) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    // Delete physical file
    await fs.unlink(metadata.storedPath);

    // Remove from store
    fileStore.delete(fileId);

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Export functions for internal use by tools
 */
export function getFileMetadata(fileId: string): FileMetadata | undefined {
  return fileStore.get(fileId);
}

export function markFileAsProcessed(fileId: string): void {
  const metadata = fileStore.get(fileId);
  if (metadata) {
    metadata.processed = true;
    fileStore.set(fileId, metadata);
  }
}

export function cleanupOldFiles(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [fileId, metadata] of fileStore.entries()) {
    const age = now - new Date(metadata.uploadedAt).getTime();
    if (age > maxAge) {
      fs.unlink(metadata.storedPath).catch(() => {});
      fileStore.delete(fileId);
      console.log(`[Files] Cleaned up old file: ${fileId}`);
    }
  }
}

// Schedule cleanup every 30 minutes
setInterval(cleanupOldFiles, 30 * 60 * 1000);

export default router;
