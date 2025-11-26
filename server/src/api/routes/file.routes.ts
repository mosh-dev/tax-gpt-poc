import { Router } from 'express';
import multer from 'multer';
import { FileController } from '@api/controllers/file.controller';
import { MAX_FILE_SIZE } from '@/shared/constants/file-upload';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
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
