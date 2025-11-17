/**
 * File Storage Service Interface
 * Contract for file storage operations
 */

export interface StorageOptions {
  generateUrl?: boolean;
  expiresIn?: number; // milliseconds
}

export interface StoredFileInfo {
  path: string;
  url?: string;
  size: number;
}

export interface IFileStorageService {
  /**
   * Save file to storage
   */
  saveFile(
    file: Buffer | string,
    fileName: string,
    options?: StorageOptions
  ): Promise<StoredFileInfo>;

  /**
   * Get file from storage
   */
  getFile(filePath: string): Promise<Buffer>;

  /**
   * Delete file from storage
   */
  deleteFile(filePath: string): Promise<void>;

  /**
   * Check if file exists
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Get file URL
   */
  getFileUrl(fileName: string): string;

  /**
   * Cleanup expired files
   */
  cleanupExpiredFiles(): Promise<number>;
}
