import { Request, Response } from 'express';
import { getErrorMessage } from '@utils/error-handler';
import { UploadFileUseCase } from '@domains/document/use-cases/upload-file.use-case';
import { ProcessDocumentUseCase } from '@domains/document/use-cases/process-document.use-case';
import { GetFileUseCase } from '@domains/document/use-cases/get-file.use-case';
import { DeleteFileUseCase } from '@domains/document/use-cases/delete-file.use-case';
import { ProcessDocumentDTO, UploadFileDTO } from '@domains/document/dtos/file-dto';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

export class FileController {
  private readonly uploadFileUseCase = injectFromContainer(UploadFileUseCase);
  private readonly processDocumentUseCase = injectFromContainer(ProcessDocumentUseCase);
  private readonly getFileUseCase = injectFromContainer(GetFileUseCase);
  private readonly deleteFileUseCase = injectFromContainer(DeleteFileUseCase);
  private readonly logger = injectFromContainer(LoggerService);

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

          return await this.uploadFileUseCase.execute(uploadDTO);
        })
      );

      res.json({
        success: true,
        files: uploadedFiles,
      });
    } catch (error) {
      this.logger.error({ error }, '[FileController] Upload error');
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
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
    } catch (error) {
      this.logger.error({ error }, '[FileController] Process documents error');
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
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
    } catch (error) {
      this.logger.error({ error }, '[FileController] Get file error');
      const errorMsg = getErrorMessage(error);
      if (errorMsg.includes('not found')) {
        res.status(404).json({
          success: false,
          error: errorMsg,
        });
      } else {
        res.status(500).json({
          success: false,
          error: errorMsg,
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
    } catch (error) {
      this.logger.error({ error }, '[FileController] Delete file error');
      const errorMsg = getErrorMessage(error);
      if (errorMsg.includes('not found')) {
        res.status(404).json({
          success: false,
          error: errorMsg,
        });
      } else {
        res.status(500).json({
          success: false,
          error: errorMsg,
        });
      }
    }
  }
}
