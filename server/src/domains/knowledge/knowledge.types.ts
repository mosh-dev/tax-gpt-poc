/**
 * Knowledge Domain Types
 * Type definitions for knowledge base operations
 */

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