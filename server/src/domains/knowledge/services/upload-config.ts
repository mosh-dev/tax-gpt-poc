/**
 * Multer Upload Configuration for Knowledge Base
 * Handles file upload configuration and validation
 */

import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { getStoragePath } from '@config/storage';
import fs from 'fs/promises';
import { MAX_KNOWLEDGE_FILE_SIZE } from '@/shared/constants/file-upload';
import { KNOWLEDGE_BASE_CONFIG, isAllowedFileExtension, isAllowedMimeType } from '@/shared/constants/knowledge-base';

/**
 * Multer storage configuration
 * Saves files to the centralized storage directory with UUID-based filenames
 */
const storage = multer.diskStorage({
  destination: (_, _file, cb) => {
    const filesDir = getStoragePath('files');
    void fs.mkdir(filesDir, { recursive: true })
      .then(() => cb(null, filesDir));
  },
  filename: (_, file, cb) => {
    // Generate unique filename with UUID (File Service pattern)
    const fileId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

/**
 * Multer file filter
 * Validates file types and MIME types
 */
const fileFilter: multer.Options['fileFilter'] = (_, file, cb) => {
  const extname = isAllowedFileExtension(file.originalname);
  const mimeOk = isAllowedMimeType(file.mimetype);

  if (extname && (mimeOk || extname)) {
    return cb(null, true);
  }

  const allowedExtensions = KNOWLEDGE_BASE_CONFIG.ALLOWED_EXTENSIONS.join(', ');
  cb(new Error(`Only ${allowedExtensions} files are allowed for knowledge base`));
};

/**
 * Configured multer upload middleware
 */
export const knowledgeUpload = multer({
  storage,
  limits: {
    fileSize: MAX_KNOWLEDGE_FILE_SIZE,
  },
  fileFilter,
});
