/**
 * MongoDB Repository Service
 * Centralized data access layer for all database operations
 * Provides abstraction over Mongoose models
 */

import { FileData, FileModel } from '@domains/document/models/file.model';
import { ObjectMap } from '@/types/common.types';
import { connectDatabase, isDatabaseConnected } from '@infrastructure/database/connection';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

export interface CreateFileData {
  fileId: string;
  conversationId?: string;
  originalName: string;
  storedPath: string;
  url: string;
  mimeType: string;
  size: number;
  processed?: boolean;
  ocrResult?: any;
  uploadedAt?: Date;
  expiresAt?: Date;
}

export class MongoRepository {
  private readonly logger = injectFromContainer(LoggerService);
  /**
   * Check if database is connected
   */
  private isConnected(): boolean {
    return isDatabaseConnected();
  }

  /**
   * Attempt to reconnect to database
   */
  private async reconnect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    this.logger.log('[MongoRepository] Attempting to reconnect to database...');
    try {
      await connectDatabase();
      this.logger.log('[MongoRepository] Successfully reconnected to database');
    } catch (error) {
      this.logger.error(error,'[MongoRepository] Failed to reconnect to database');
      throw error;
    }
  }

  /**
   * Handle database operation with connection check and reconnection
   */
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isConnected()) {
      this.logger.warn('[MongoRepository] Database not connected, attempting reconnection...');
      await this.reconnect();
    }

    return await operation();
  }

  // ==================== File Operations ====================

  /**
   * Create a new file record
   */
  async createFile(data: CreateFileData): Promise<FileData | null> {
    const doc = await this.execute(
      async () => await FileModel.create({
        fileId: data.fileId,
        conversationId: data.conversationId,
        originalName: data.originalName,
        storedPath: data.storedPath,
        url: data.url,
        mimeType: data.mimeType,
        size: data.size,
        processed: data.processed || false,
        ocrResult: data.ocrResult,
        uploadedAt: data.uploadedAt || new Date(),
        expiresAt: data.expiresAt,
      })
    );
    return doc ? (doc.toObject() as FileData) : null;
  }

  /**
   * Find file by ID
   */
  async findFileById(fileId: string): Promise<FileData | null> {
    const result = await this.execute(
      async () => await FileModel.findOne({ fileId }).lean()
    );
    return result as FileData | null;
  }

  /**
   * Mark file as processed
   */
  async markFileAsProcessed(fileId: string, ocrResult?: any): Promise<void> {
    const updateData: ObjectMap = { processed: true };
    if (ocrResult) {
      updateData.ocrResult = ocrResult;
    }
    await this.execute(
      async () => {
        await FileModel.updateOne({ fileId }, { $set: updateData });
      }
    );
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.execute(
      async () => {
        await FileModel.deleteOne({ fileId });
      }
    );
  }
}
