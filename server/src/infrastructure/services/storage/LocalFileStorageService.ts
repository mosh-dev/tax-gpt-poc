/**
 * Local File Storage Service Implementation
 * Implements IFileStorageService using local file system
 */

import fs from 'fs/promises';
import path from 'path';
import { getStoragePath } from '@config/storage';
import { IFileStorageService, StorageOptions, StoredFileInfo } from '@core/application/services/IFileStorageService';

export class LocalFileStorageService implements IFileStorageService {
  private readonly baseUrl: string;
  private readonly storagePath: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.storagePath = getStoragePath('files');
  }

  async saveFile(
    file: Buffer | string,
    fileName: string,
    options?: StorageOptions
  ): Promise<StoredFileInfo> {
    const filePath = path.join(this.storagePath, fileName);

    // Ensure directory exists
    await fs.mkdir(this.storagePath, { recursive: true });

    // Write file
    if (Buffer.isBuffer(file)) {
      await fs.writeFile(filePath, file);
    } else {
      await fs.writeFile(filePath, file, 'utf-8');
    }

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      path: filePath,
      url: options?.generateUrl ? this.getFileUrl(fileName) : undefined,
      size: stats.size,
    };
  }

  async getFile(filePath: string): Promise<Buffer> {
    return await fs.readFile(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, ignore
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(fileName: string): string {
    return `${this.baseUrl}/files/${fileName}`;
  }

  async cleanupExpiredFiles(): Promise<number> {
    // This is handled by the file repository/use case
    // Just a placeholder implementation
    return 0;
  }
}
