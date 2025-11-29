/**
 * File Service
 * Handles all file-related operations (upload, download, delete, get)
 * Coordinates between file system and database
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getStoragePath } from '@config/storage';
import { Environment } from '@config/environment';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { MongoRepository } from '@infrastructure/database/base-repository';
import { LoggerService } from '@infrastructure/logger/logger.service';

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
  private readonly mongoRepository = injectFromContainer(MongoRepository);
  private readonly logger = injectFromContainer(LoggerService);
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
      : `${Environment.BASE_URL}/files/${file.filename}`;

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
    await this.mongoRepository.createFile(fileData);

    this.logger.info(`[FileService] Saved file: ${file.originalname} (ID: ${fileId}, ${file.size} bytes)`);

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
    const file = await this.mongoRepository.findFileById(fileId);

    if (!file) {
      this.logger.warn(`[FileService] File not found for deletion: ${fileId}`);
      return false;
    }

    try {
      // Delete physical file
      await fs.unlink(file.storedPath);
      this.logger.info(`[FileService] Deleted physical file: ${file.storedPath}`);
    } catch (error : any) {
      this.logger.error(error,`[FileService] Failed to delete physical file: ${file.storedPath}`);
      // Continue with database deletion even if physical file deletion fails
    }

    // Delete from database
    await this.mongoRepository.deleteFile(fileId);

    this.logger.info(`[FileService] Deleted file: ${fileId}`);
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
    const fileUrl = `${Environment.BASE_URL}/files/${storedFilename}`;

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
    await this.mongoRepository.createFile(fileData);

    this.logger.info(`[FileService] Saved generated file: ${filename} (ID: ${fileId}, ${buffer.length} bytes)`);

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
    const file = await this.mongoRepository.findFileById(fileId);
    return file ? file.url : null;
  }
}
