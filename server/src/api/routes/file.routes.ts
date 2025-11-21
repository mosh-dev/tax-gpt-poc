/**
 * File Routes
 * Defines routes for file operations
 */

import { Router } from 'express';
import multer from 'multer';
import { FileController } from '../controllers';

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function createFileRoutes(controller: FileController): Router {
  const router = Router();

  // POST /api/files/upload - Upload files
  router.post('/upload', upload.array('files'), (req, res) => controller.upload(req, res));

  // POST /api/files/process - Process documents with OCR
  router.post('/process', (req, res) => controller.processDocuments(req, res));

  // GET /api/files/:id - Get file metadata
  router.get('/:id', (req, res) => controller.getFile(req, res));

  // DELETE /api/files/:id - Delete file
  router.delete('/:id', (req, res) => controller.deleteFile(req, res));

  return router;
}
