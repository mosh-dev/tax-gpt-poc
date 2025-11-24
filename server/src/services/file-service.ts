/**
 * File Service
 * Handles all file-related operations (upload, download, delete, get)
 * Coordinates between file system and database
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getStoragePath } from '../config/storage';
import { mongoRepository } from './mongo-repository';
import { env } from '@config/env';

export interface UploadedFileInfo {
  fileId: string;
  originalName: string;
  storedPath: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  conversationId?: string;
}

export interface FileMetadata {
  fileId: string;
  originalName: string;
  storedPath: string;
  url: string;
  mimeType: string;
  size: number;
  processed: boolean;
  ocrResult?: any;
  uploadedAt: Date;
  expiresAt?: Date;
  conversationId?: string;
}

export class FileService {
  /**
   * Save uploaded file and create database record
   */
  async saveFile(
    file: Express.Multer.File,
    conversationId?: string,
    baseUrl?: string
  ): Promise<UploadedFileInfo> {

    const fileId = path.basename(file.filename, path.extname(file.filename));
    const fileUrl = baseUrl
      ? `${baseUrl}/files/${file.filename}`
      : `${env.BASE_URL}/files/${file.filename}`;

    const fileData = {
      fileId,
      conversationId,
      originalName: file.originalname,
      storedPath: file.path,
      url: fileUrl,
      mimeType: file.mimetype,
      size: file.size,
      processed: false,
      uploadedAt: new Date(),
      // No expiry - files are permanent
    };

    // Save to database
    await mongoRepository.createFile(fileData);

    console.log(`[FileService] Saved file: ${file.originalname} (ID: ${fileId}, ${file.size} bytes)`);

    return {
      fileId,
      originalName: file.originalname,
      storedPath: file.path,
      url: fileUrl,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      conversationId,
    };
  }

  /**
   * Get file metadata by ID
   */
  async getFile(fileId: string): Promise<FileMetadata | null> {
    const file = await mongoRepository.findFileById(fileId);

    if (!file) {
      console.warn(`[FileService] File not found: ${fileId}`);
      return null;
    }

    return {
      fileId: file.fileId,
      originalName: file.originalName,
      storedPath: file.storedPath,
      url: file.url,
      mimeType: file.mimeType,
      size: file.size,
      processed: file.processed,
      ocrResult: file.ocrResult,
      uploadedAt: file.uploadedAt,
      expiresAt: file.expiresAt,
      conversationId: file.conversationId,
    };
  }

  /**
   * Delete file (physical file + database record)
   */
  async deleteFile(fileId: string): Promise<boolean> {
    // Get file metadata
    const file = await mongoRepository.findFileById(fileId);

    if (!file) {
      console.warn(`[FileService] File not found for deletion: ${fileId}`);
      return false;
    }

    try {
      // Delete physical file
      await fs.unlink(file.storedPath);
      console.log(`[FileService] Deleted physical file: ${file.storedPath}`);
    } catch (error) {
      console.error(`[FileService] Failed to delete physical file: ${file.storedPath}`, error);
      // Continue with database deletion even if physical file deletion fails
    }

    // Delete from database
    await mongoRepository.deleteFile(fileId);

    console.log(`[FileService] Deleted file: ${fileId}`);
    return true;
  }

  /**
   * Mark file as processed and save OCR result
   */
  async markAsProcessed(fileId: string, ocrResult?: any): Promise<void> {
    await mongoRepository.markFileAsProcessed(fileId, ocrResult);
    console.log(`[FileService] Marked file as processed: ${fileId}`);
  }

  /**
   * Get files by conversation ID
   */
  async getFilesByConversation(conversationId: string): Promise<FileMetadata[]> {
    const files = await mongoRepository.getFilesByConversationId(conversationId);

    return files.map(file => ({
      fileId: file.fileId,
      originalName: file.originalName,
      storedPath: file.storedPath,
      url: file.url,
      mimeType: file.mimeType,
      size: file.size,
      processed: file.processed,
      ocrResult: file.ocrResult,
      uploadedAt: file.uploadedAt,
      expiresAt: file.expiresAt,
      conversationId: file.conversationId,
    }));
  }

  /**
   * Cleanup expired files (physical + database)
   */
  async cleanupExpiredFiles(): Promise<number> {
    const expiredFiles = await mongoRepository.findExpiredFiles();

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        // Delete physical file
        await fs.unlink(file.storedPath).catch(() => {
          console.warn(`[FileService] Physical file not found: ${file.storedPath}`);
        });

        // Delete from database
        await mongoRepository.deleteFile(file.fileId);

        deletedCount++;
        console.log(`[FileService] Cleaned up expired file: ${file.fileId}`);
      } catch (error) {
        console.error(`[FileService] Failed to cleanup file ${file.fileId}:`, error);
      }
    }

    if (deletedCount > 0) {
      console.log(`[FileService] Cleaned up ${deletedCount} expired files`);
    }

    return deletedCount;
  }

  /**
   * Check if file exists (physical file)
   */
  async fileExists(fileId: string): Promise<boolean> {
    const file = await mongoRepository.findFileById(fileId);

    if (!file) {
      return false;
    }

    try {
      await fs.access(file.storedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file path by ID
   */
  async getFilePath(fileId: string): Promise<string | null> {
    const file = await mongoRepository.findFileById(fileId);
    return file ? file.storedPath : null;
  }

  /**
   * Save a generated file (e.g., PDF) and create database record
   */
  async saveGeneratedFile(
    content: Buffer | string,
    filename: string,
    mimeType: string,
    conversationId?: string
  ): Promise<UploadedFileInfo> {

    const fileId = randomUUID();
    const storedFilename = `${fileId}${path.extname(filename)}`;
    const storedPath = path.join(getStoragePath('files'), storedFilename);
    const fileUrl = `${env.BASE_URL}/files/${storedFilename}`;

    // Write file to disk
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    await fs.writeFile(storedPath, buffer);

    const fileData = {
      fileId,
      conversationId,
      originalName: filename,
      storedPath,
      url: fileUrl,
      mimeType,
      size: buffer.length,
      processed: true, // Generated files are already processed
      uploadedAt: new Date(),
      // No expiry for generated files - they should persist
    };

    // Save to database
    await mongoRepository.createFile(fileData);

    console.log(`[FileService] Saved generated file: ${filename} (ID: ${fileId}, ${buffer.length} bytes)`);

    return {
      fileId,
      originalName: filename,
      storedPath,
      url: fileUrl,
      mimeType,
      size: buffer.length,
      uploadedAt: new Date(),
      conversationId,
    };
  }

  /**
   * Get file URL by ID
   */
  async getFileUrl(fileId: string): Promise<string | null> {
    const file = await mongoRepository.findFileById(fileId);
    return file ? file.url : null;
  }
}

// Export singleton instance
export const fileService = new FileService();
