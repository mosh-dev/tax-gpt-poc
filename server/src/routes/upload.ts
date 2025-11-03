import { Router, Request, Response } from 'express';
import multer from 'multer';
import { extractTaxDataFromPDF } from '../services/pdf-extractor';

const router = Router();

// Configure multer for memory storage (no disk storage needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * POST /api/upload/pdf
 * Upload and extract data from a PDF tax document
 */
router.post('/pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const { buffer, originalname } = req.file;

    // Extract text and parse tax data from PDF
    const result = await extractTaxDataFromPDF(buffer, originalname);

    res.json(result);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process PDF',
      fileName: req.file?.originalname || 'unknown',
    });
  }
});

/**
 * Error handler for multer
 */
router.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
  next(error);
});

export default router;
