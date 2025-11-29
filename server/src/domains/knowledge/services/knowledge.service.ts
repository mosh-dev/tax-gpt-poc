import { FileService } from '@domains/document/services/file.service';
import { Environment } from '@config/environment';
import path from 'path';
import type {
  UploadFileParams,
  ListFilesResult,
  DeleteFileResult
} from '@domains/knowledge/knowledge.types';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { RAGService } from '@domains/knowledge/services/rag.service';

export class KnowledgeService {
  private readonly ragService = injectFromContainer(RAGService);
  /**
   * Upload and process a knowledge base file
   */
  async uploadFile(params: UploadFileParams): Promise<{ fileId: string; fileName: string; size: number; chunkCount: number }> {
    const { file, onProgress } = params;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`[KnowledgeService] Uploading file: ${file.originalname}`);

    // Save file using File Service from container
    const fileService = injectFromContainer(FileService);
    const savedFile = await fileService.saveFile(file, undefined, Environment.BASE_URL);
    const fileType = path.extname(file.originalname).substring(1) as 'txt' | 'md' | 'pdf';

    // Process file with RAG service (this runs asynchronously with progress callbacks)
    const result = await this.ragService.ingestFile(
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
    const files = await this.ragService.listFiles();

    // Fetch download URLs from File service
    const fileService = injectFromContainer(FileService);
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
    await this.ragService.deleteFile(fileId);

    // Delete file from File service (handles physical file + DB)
    const fileService = injectFromContainer(FileService);
    await fileService.deleteFile(fileId);

    console.log(`[KnowledgeService] File deleted successfully: ${fileId}`);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}
