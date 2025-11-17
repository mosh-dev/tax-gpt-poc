/**
 * File Storage Routes
 * Handles file uploads without immediate OCR processing
 * Files are stored with unique IDs and processed later by AI agent tools
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { getStoragePath } from '../config/storage';
import { fileService } from '../services/file-service';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const filesDir = getStoragePath('files');
    await fs.mkdir(filesDir, { recursive: true });
    cb(null, filesDir);
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
    const { conversationId } = req.body; // Optional conversation ID

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploadedFiles: any[] = [];

    for (const file of files) {
      const fileInfo = await fileService.saveFile(file, conversationId, baseUrl);
      uploadedFiles.push(fileInfo);
    }

    res.json({
      success: true,
      count: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        id: f.fileId,
        name: f.originalName,
        size: f.size,
        type: f.mimeType,
        url: f.url,
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const file = await fileService.getFile(fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      id: file.fileId,
      name: file.originalName,
      size: file.size,
      type: file.mimeType,
      url: file.url,
      uploadedAt: file.uploadedAt,
      processed: file.processed,
      ocrResult: file.ocrResult,
    });
  } catch (error) {
    console.error('[Files] Failed to get file:', error);
    res.status(500).json({
      error: 'Failed to retrieve file metadata',
    });
  }
});

/**
 * DELETE /api/files/:id
 * Delete file by ID
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const deleted = await fileService.deleteFile(fileId);

    if (!deleted) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('[Files] Failed to delete file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Export functions for internal use by tools
 */
export async function getFileMetadata(fileId: string): Promise<any | null> {
  return await fileService.getFile(fileId);
}

export async function markFileAsProcessed(fileId: string, ocrResult?: any): Promise<void> {
  await fileService.markAsProcessed(fileId, ocrResult);
}

export async function cleanupOldFiles(): Promise<void> {
  await fileService.cleanupExpiredFiles();
}

// Schedule cleanup every 30 minutes
setInterval(cleanupOldFiles, 30 * 60 * 1000);

export default router;
