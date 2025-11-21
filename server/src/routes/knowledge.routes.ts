/**
 * Knowledge Base Routes
 * Handles knowledge base file uploads, listing, and deletion
 * Files are processed with RAG for semantic search
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { getStoragePath } from '../config/storage';
import { getRAGService } from '../services/rag';
import { authMiddleware } from '../middleware/auth.middleware';
import fs from 'fs/promises';

const router = Router();

// Configure multer for knowledge base uploads
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
    cb(null, `kb_${fileId}${ext}`); // Prefix with 'kb_' for knowledge base files
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for knowledge base files
  },
  fileFilter: (req, file, cb) => {
    // Accept only txt, md, and pdf files
    const allowedTypes = /txt|md|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    // Check mime types
    const allowedMimes = ['text/plain', 'text/markdown', 'application/pdf'];
    const mimeOk = allowedMimes.some(mime => file.mimetype.includes(mime)) ||
                   file.mimetype === 'application/octet-stream'; // For .md files sometimes

    if (extname && (mimeOk || extname)) {
      return cb(null, true);
    }
    cb(new Error('Only .txt, .md, and .pdf files are allowed for knowledge base'));
  }
});

/**
 * POST /api/knowledge/upload
 * Upload knowledge base file and process with RAG
 * Requires authentication
 */
router.post('/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[Knowledge API] Uploading file: ${file.originalname}`);

    // Extract file ID from filename (remove 'kb_' prefix and extension)
    const fileId = path.basename(file.filename, path.extname(file.filename)).replace(/^kb_/, '');
    const fileType = path.extname(file.originalname).substring(1) as 'txt' | 'md' | 'pdf';

    // Ingest file with RAG service
    const ragService = getRAGService();
    const result = await ragService.ingestFile(file.path, {
      fileId,
      fileName: file.originalname,
      fileType,
      size: file.size,
    });

    console.log(`[Knowledge API] File ingested successfully: ${result.chunkCount} chunks created`);

    res.json({
      success: true,
      file: {
        id: result.fileId,
        name: result.fileName,
        chunkCount: result.chunkCount,
        stats: result.stats,
      }
    });

  } catch (error) {
    console.error('[Knowledge API] Upload error:', error);

    // Clean up file if it exists
    const file = req.file as Express.Multer.File;
    if (file) {
      await fs.unlink(file.path).catch(() => {});
    }

    res.status(500).json({
      error: 'Failed to upload and process file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge/files
 * List all knowledge base files
 * Requires authentication
 */
router.get('/files', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ragService = getRAGService();
    const files = await ragService.listFiles();

    res.json({
      success: true,
      count: files.length,
      files: files.map(f => ({
        id: f.fileId,
        name: f.fileName,
        type: f.fileType,
        size: f.size,
        chunkCount: f.chunkCount,
        uploadedAt: f.uploadedAt,
      }))
    });

  } catch (error) {
    console.error('[Knowledge API] List error:', error);

    res.status(500).json({
      error: 'Failed to list files',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/knowledge/files/:id
 * Delete a knowledge base file and all its vectors
 * Requires authentication
 */
router.delete('/files/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    console.log(`[Knowledge API] Deleting file: ${id}`);

    const ragService = getRAGService();
    await ragService.deleteFile(id);

    console.log(`[Knowledge API] File deleted successfully: ${id}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('[Knowledge API] Delete error:', error);

    res.status(500).json({
      error: 'Failed to delete file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
