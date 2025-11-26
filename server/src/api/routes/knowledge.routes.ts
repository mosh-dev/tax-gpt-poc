import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { authMiddleware } from '../middleware/auth.middleware';
import { getErrorMessage } from '@utils/error-handler';
import { progressManager } from '@domains/knowledge/services/progress-manager';
import { knowledgeUpload } from '@domains/knowledge/services/upload-config';
import { knowledgeService } from '@domains/knowledge/services/knowledge.service';

const router = Router();

/**
 * POST /api/knowledge/upload
 * Upload knowledge base file and process with RAG
 * Returns immediately with uploadId for progress tracking
 * Requires authentication
 */
router.post('/upload', authMiddleware, knowledgeUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    console.log(`[KnowledgeRoutes] Uploading file: ${file.originalname}`);

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

      console.log(`[KnowledgeRoutes] File ingested successfully: ${result.fileName} (${result.chunkCount} chunks)`);

      // Send completion event
      progressManager.complete(uploadId, {
        type: 'complete',
        chunkCount: result.chunkCount,
        stats: { totalChunks: result.chunkCount, avgChunkSize: 0, estimatedTokens: 0 },
      });
    } catch (processingError: unknown) {
      const errorMsg = getErrorMessage(processingError);
      console.error('[KnowledgeRoutes] Processing error:', errorMsg);
      progressManager.error(uploadId, errorMsg);
    }

  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[KnowledgeRoutes] Upload error:', errorMsg);

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
  const { uploadId } = req.params;

  if (!uploadId) {
    res.status(400).json({ error: 'Upload ID is required' });
    return;
  }

  console.log(`[Knowledge API] SSE connection for upload: ${uploadId}`);
  progressManager.subscribe(uploadId, res);
});

/**
 * GET /api/knowledge/files
 * List all knowledge base files
 * Requires authentication
 */
router.get('/files', authMiddleware, async (_: Request, res: Response) => {
  try {
    const result = await knowledgeService.listFiles();
    res.json(result);
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[KnowledgeRoutes] List error:', errorMsg);

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
router.delete('/files/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'File ID is required' });
      return;
    }

    console.log(`[KnowledgeRoutes] Deleting file: ${id}`);

    const result = await knowledgeService.deleteFile(id);
    res.json(result);

  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[KnowledgeRoutes] Delete error:', errorMsg);

    res.status(500).json({
      error: 'Failed to delete file',
      message: errorMsg
    });
  }
});

export const knowledgeRoutes = router;
