/**
 * File Service
 * Handles all file-related operations (upload, download, delete, get)
 * Coordinates between file system and database
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getStoragePath } from '@utils/storage';
import { mongoRepository } from '@infrastructure/database/mongo-repository.class';
import { env } from '@/env';

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
      processed: true,
      uploadedAt: new Date()
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
