import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { authMiddleware } from '../middleware/auth.middleware';
import { getErrorMessage } from '@utils/error-handler';
import { progressManager } from '@domains/knowledge/services/progress-manager';
import { knowledgeUpload } from '@domains/knowledge/services/upload-config';
import { KnowledgeService } from '@domains/knowledge/services/knowledge.service';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

const router = Router();

/**
 * POST /api/knowledge/upload
 * Upload knowledge base file and process with RAG
 * Returns immediately with uploadId for progress tracking
 * Requires authentication
 */
router.post('/upload', knowledgeUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const logger = injectFromContainer(LoggerService);
  try {
    const file = req.file as Express.Multer.File;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    logger.info(`[KnowledgeRoutes] Uploading file: ${file.originalname}`);

    // Generate unique upload ID for progress tracking
    const uploadId = randomUUID();

    // Return immediately with upload ID
    res.json({
      success: true,
      uploadId,
      fileId: file.filename.split('.')[0], // Temporary ID until saved
      fileName: file.originalname,
    });

    // Process asynchronously with progress callbacks
    try {
      const knowledgeService = injectFromContainer(KnowledgeService);
      const result = await knowledgeService.uploadFile({
        file,
        onProgress: (stage, progress, message) => {
          progressManager.emitProgress(uploadId, {
            type: 'progress',
            stage,
            progress,
            message,
          });
        }
      });

      logger.info(`[KnowledgeRoutes] File ingested successfully: ${result.fileName} (${result.chunkCount} chunks)`);

      // Send completion event
      progressManager.complete(uploadId, {
        type: 'complete',
        chunkCount: result.chunkCount,
        stats: { totalChunks: result.chunkCount, avgChunkSize: 0, estimatedTokens: 0 },
      });
    } catch (processingError) {
      const errorMsg = getErrorMessage(processingError);
      logger.error(processingError, '[KnowledgeRoutes] Processing error');
      progressManager.error(uploadId, errorMsg);
    }

  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error({ error },'[KnowledgeRoutes] Upload error');

    res.status(500).json({
      error: 'Failed to upload file',
      message: errorMsg
    });
  }
});

/**
 * GET /api/knowledge/upload-progress/:uploadId
 * SSE endpoint for upload progress updates
 * Requires authentication
 */
router.get('/upload-progress/:uploadId', authMiddleware, (req: Request, res: Response): void => {
  const logger = injectFromContainer(LoggerService);
  const { uploadId } = req.params;

  if (!uploadId) {
    res.status(400).json({ error: 'Upload ID is required' });
    return;
  }

  logger.info(`[Knowledge API] SSE connection for upload: ${uploadId}`);
  progressManager.subscribe(uploadId, res);
});

/**
 * GET /api/knowledge/files
 * List all knowledge base files
 * Requires authentication
 */
router.get('/files', async (_: Request, res: Response) => {
  const logger = injectFromContainer(LoggerService);
  try {
    const knowledgeService = injectFromContainer(KnowledgeService);
    const result = await knowledgeService.listFiles();
    res.json(result);
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error({ error },'[KnowledgeRoutes] List error');

    res.status(500).json({
      error: 'Failed to list files',
      message: errorMsg
    });
  }
});

/**
 * DELETE /api/knowledge/files/:id
 * Delete a knowledge base file and all its vectors
 * Requires authentication
 */
router.delete('/files/:id', async (req: Request, res: Response): Promise<void> => {
  const logger = injectFromContainer(LoggerService);
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'File ID is required' });
      return;
    }

    logger.info(`[KnowledgeRoutes] Deleting file: ${id}`);

    const knowledgeService = injectFromContainer(KnowledgeService);
    const result = await knowledgeService.deleteFile(id);
    res.json(result);

  } catch (error) {
    logger.error({ error }, '[KnowledgeRoutes] Delete error');

    res.status(500).json({
      error: 'Failed to delete file',
      message: getErrorMessage(error)
    });
  }
});

export const knowledgeRoutes = router;
