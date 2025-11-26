import { Router } from 'express';
import multer from 'multer';
import { FileController } from '@api/controllers/file.controller';
import { MAX_FILE_SIZE } from '@/shared/constants/file-upload';
import { injectFromContainer } from '@/app/di-container/container-helper';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

const router = Router();


// POST /api/files/upload - Upload files
router.post('/upload', upload.array('files'), (req, res) => injectFromContainer(FileController).upload(req, res));

// POST /api/files/process - Process documents with OCR
router.post('/process', (req, res) => injectFromContainer(FileController).processDocuments(req, res));

// GET /api/files/:id - Get file metadata
router.get('/:id', (req, res) => injectFromContainer(FileController).getFile(req, res));

// DELETE /api/files/:id - Delete file
router.delete('/:id', (req, res) => injectFromContainer(FileController).deleteFile(req, res));


export const fileRoutes = router;
