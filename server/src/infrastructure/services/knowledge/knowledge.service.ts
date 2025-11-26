/**
 * Knowledge Service
 * Orchestration layer for knowledge base operations
 */

import { getRAGService } from './rag-service.class';
import { fileService } from '@infrastructure/services/document/file-service.class';
import { Environment } from '@config/environment';
import path from 'path';

export interface UploadFileParams {
  file: Express.Multer.File;
  onProgress?: (stage: 'extracting' | 'chunking' | 'embedding', progress: number, message: string) => void;
}

export interface UploadFileResult {
  success: boolean;
  uploadId?: string;
  fileId: string;
  fileName: string;
  error?: string;
}

export interface KnowledgeFileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  uploadedAt: Date;
  downloadUrl?: string;
}

export interface ListFilesResult {
  success: boolean;
  count: number;
  files: KnowledgeFileInfo[];
}

export interface DeleteFileResult {
  success: boolean;
  message: string;
}

export class KnowledgeService {
  /**
   * Upload and process a knowledge base file
   */
  async uploadFile(params: UploadFileParams): Promise<{ fileId: string; fileName: string; size: number; chunkCount: number }> {
    const { file, onProgress } = params;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`[KnowledgeService] Uploading file: ${file.originalname}`);

    // Save file using File Service
    const savedFile = await fileService.saveFile(file, undefined, Environment.BASE_URL);
    const fileType = path.extname(file.originalname).substring(1) as 'txt' | 'md' | 'pdf';

    // Process file with RAG service (this runs asynchronously with progress callbacks)
    const ragService = getRAGService();
    const result = await ragService.ingestFile(
      savedFile.storedPath,
      {
        fileId: savedFile.fileId,
        fileName: savedFile.originalName,
        fileType,
        size: savedFile.size,
      },
      onProgress
    );

    console.log(`[KnowledgeService] File processed successfully: ${savedFile.originalName}`);

    return {
      fileId: savedFile.fileId,
      fileName: savedFile.originalName,
      size: savedFile.size,
      chunkCount: result.chunkCount,
    };
  }

  /**
   * List all knowledge base files
   */
  async listFiles(): Promise<ListFilesResult> {
    const ragService = getRAGService();
    const files = await ragService.listFiles();

    // Fetch download URLs from File service
    const filesWithUrls = await Promise.all(
      files.map(async (f) => {
        const fileUrl = await fileService.getFileUrl(f.fileId);
        return {
          id: f.fileId,
          name: f.fileName,
          type: f.fileType,
          size: f.size,
          chunkCount: f.chunkCount,
          uploadedAt: f.uploadedAt,
          downloadUrl: fileUrl || undefined,
        };
      })
    );

    return {
      success: true,
      count: filesWithUrls.length,
      files: filesWithUrls,
    };
  }

  /**
   * Delete a knowledge base file and all its vectors
   */
  async deleteFile(fileId: string): Promise<DeleteFileResult> {
    if (!fileId) {
      throw new Error('File ID is required');
    }

    console.log(`[KnowledgeService] Deleting file: ${fileId}`);

    // Delete vectors from RAG service
    const ragService = getRAGService();
    await ragService.deleteFile(fileId);

    // Delete file from File service (handles physical file + DB)
    await fileService.deleteFile(fileId);

    console.log(`[KnowledgeService] File deleted successfully: ${fileId}`);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}

// Export singleton instance
export const knowledgeService = new KnowledgeService();
