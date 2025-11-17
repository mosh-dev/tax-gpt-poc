/**
 * File Controller
 * Handles HTTP requests for file operations
 */

import { Request, Response } from 'express';
import {
  UploadFileUseCase,
  ProcessDocumentUseCase,
  GetFileUseCase,
  DeleteFileUseCase,
} from '../../../core/application/use-cases';
import { UploadFileDTO, ProcessDocumentDTO } from '../../../core/application/dtos';

export class FileController {
  constructor(
    private uploadFileUseCase: UploadFileUseCase,
    private processDocumentUseCase: ProcessDocumentUseCase,
    private getFileUseCase: GetFileUseCase,
    private deleteFileUseCase: DeleteFileUseCase
  ) {}

  /**
   * POST /api/files/upload
   * Upload files
   */
  async upload(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const { conversationId } = req.body;

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files provided',
        });
        return;
      }

      const baseUrl = req.protocol + '://' + req.get('host');

      // Upload all files
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const uploadDTO: UploadFileDTO = {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            buffer: file.buffer,
            conversationId,
          };

          return await this.uploadFileUseCase.execute(uploadDTO, baseUrl);
        })
      );

      res.json({
        success: true,
        files: uploadedFiles,
      });
    } catch (error: any) {
      console.error('[FileController] Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload files',
      });
    }
  }

  /**
   * POST /api/files/process
   * Process documents with OCR (called by AI agent tool)
   */
  async processDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { fileIds, language, canton, quality } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'fileIds array is required',
        });
        return;
      }

      // Process each file
      const processRequests: ProcessDocumentDTO[] = fileIds.map((fileId: string) => ({
        fileId,
        language,
        canton,
        quality: quality || 'balanced',
      }));

      const results = await this.processDocumentUseCase.executeMultiple(processRequests);

      res.json({
        success: true,
        results,
      });
    } catch (error: any) {
      console.error('[FileController] Process documents error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process documents',
      });
    }
  }

  /**
   * GET /api/files/:id
   * Get file metadata
   */
  async getFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const file = await this.getFileUseCase.execute(id);

      res.json({
        success: true,
        file,
      });
    } catch (error: any) {
      console.error('[FileController] Get file error:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to retrieve file',
        });
      }
    }
  }

  /**
   * DELETE /api/files/:id
   * Delete file
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.deleteFileUseCase.execute(id);

      res.json({
        success: true,
        message: 'File deleted',
      });
    } catch (error: any) {
      console.error('[FileController] Delete file error:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to delete file',
        });
      }
    }
  }
}
