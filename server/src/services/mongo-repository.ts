/**
 * MongoDB Repository Service
 * Centralized data access layer for all database operations
 * Provides abstraction over Mongoose models
 */

import { Conversation, File, Message, ObjectMap } from '@models';
import { randomUUID } from 'crypto';
import mongoose, { ConnectionStates } from 'mongoose';
import { ConversationData } from '@models/conversation.model';
import { env } from '@config/env';
import { MessageData } from '@models/message.model';
import { FileData } from '@models/file.model';

export interface CreateConversationData {
  conversationId?: string;
  title: string;
  taxYear?: number;
  userId?: string;
  metadata?: any;
}

export interface CreateMessageData {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileIds?: string[];
  toolCalls?: any[];
  metadata?: any;
}

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
  /**
   * Check if database is connected
   */
  private isConnected(): boolean {
    return mongoose.connection.readyState === ConnectionStates.connected;
  }

  /**
   * Attempt to reconnect to database
   */
  private async reconnect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    console.log('[MongoRepository] Attempting to reconnect to database...');
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log('[MongoRepository] Successfully reconnected to database');
    } catch (error) {
      console.error('[MongoRepository] Failed to reconnect to database:', error);
      throw error;
    }
  }

  /**
   * Handle database operation with connection check and reconnection
   */
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isConnected()) {
      console.warn('[MongoRepository] Database not connected, attempting reconnection...');
      await this.reconnect();
    }

    return await operation();
  }

  // ==================== Conversation Operations ====================

  /**
   * Find or create conversation (atomic operation to prevent race conditions)
   */
  async findOrCreateConversation(data: CreateConversationData): Promise<ConversationData | null> {
    const conversationId = data.conversationId || randomUUID();
    const title = data.title || 'New Tax Conversation';

    // Check if title is a "real" title (not default)
    const isRealTitle = title !== 'New Tax Conversation' && title !== 'New Conversation';

    // Build update object
    const updateOp: any = {
      $setOnInsert: {
        conversationId,
        taxYear: data.taxYear,
        userId: data.userId,
        metadata: data.metadata || {},
      },
    };

    // If we have a real title, always update it; otherwise only set on insert
    if (isRealTitle) {
      updateOp.$set = { title };
    } else {
      updateOp.$setOnInsert.title = title;
    }

    const doc = await this.execute(
      async () => await Conversation.findOneAndUpdate(
        { conversationId },
        updateOp,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      ).lean()
    );

    // Log for debugging
    console.log(`[MongoRepository] findOrCreateConversation: id=${conversationId}, title="${title}", isRealTitle=${isRealTitle}`);

    return doc as ConversationData | null;
  }

  /**
   * Find conversation by ID
   */
  async findConversationById(conversationId: string): Promise<ConversationData | null> {
    const result = await this.execute(
      async () => await Conversation.findOne({ conversationId }).lean()
    );
    return result as ConversationData | null;
  }

  /**
   * Get all conversations
   */
  async getAllConversations(userId?: string, limit: number = 50): Promise<ConversationData[]> {
    const query = userId ? { userId } : {};
    const results = await this.execute(
      async () => await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean()
    );
    return results as ConversationData[];
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<CreateConversationData>
  ): Promise<void> {
    await this.execute(
      async () => {
        await Conversation.updateOne({ conversationId }, { $set: updates });
      }
    );
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.execute(
      async () => {
        await Conversation.deleteOne({ conversationId });
      }
    );
  }

  /**
   * Search conversations
   */
  async searchConversations(
    query: string,
    userId?: string,
    limit: number = 20
  ): Promise<ConversationData[]> {
    const searchQuery: any = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { 'metadata.tags': { $regex: query, $options: 'i' } },
      ],
    };

    if (userId) {
      searchQuery.userId = userId;
    }

    const results = await this.execute(
      async () => await Conversation.find(searchQuery)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean()
    );
    return results as ConversationData[];
  }

  // ==================== Message Operations ====================

  /**
   * Create a new message
   */
  async createMessage(data: CreateMessageData): Promise<MessageData | null> {
    const doc = await this.execute(
      async () => await Message.create({
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        fileIds: data.fileIds || [],
        toolCalls: data.toolCalls || [],
        metadata: data.metadata || {},
      })
    );
    return doc ? (doc.toObject() as MessageData) : null;
  }

  /**
   * Get messages for a conversation
   */
  async getMessagesByConversationId(
    conversationId: string,
    limit: number = 200
  ): Promise<MessageData[]> {
    const results = await this.execute(
      async () => await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean()
    );
    return results as MessageData[];
  }

  /**
   * Delete all messages for a conversation
   */
  async deleteMessagesByConversationId(conversationId: string): Promise<void> {
    await this.execute(
      async () => {
        await Message.deleteMany({ conversationId });
      }
    );
  }

  // ==================== File Operations ====================

  /**
   * Create a new file record
   */
  async createFile(data: CreateFileData): Promise<FileData | null> {
    const doc = await this.execute(
      async () => await File.create({
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
      async () => await File.findOne({ fileId }).lean()
    );
    return result as FileData | null;
  }

  /**
   * Update file
   */
  async updateFile(fileId: string, updates: Partial<CreateFileData>): Promise<void> {
    await this.execute(
      async () => {
        await File.updateOne({ fileId }, { $set: updates });
      }
    );
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
        await File.updateOne({ fileId }, { $set: updateData });
      }
    );
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.execute(
      async () => {
        await File.deleteOne({ fileId });
      }
    );
  }

  /**
   * Get files by conversation ID
   */
  async getFilesByConversationId(conversationId: string): Promise<FileData[]> {
    const results = await this.execute(
      async () => await File.find({ conversationId })
        .sort({ uploadedAt: -1 })
        .lean()
    );
    return results as FileData[];
  }

  /**
   * Find expired files
   */
  async findExpiredFiles(): Promise<FileData[]> {
    const results = await this.execute(
      async () => await File.find({
        expiresAt: { $lt: new Date() },
      }).lean()
    );
    return results as FileData[];
  }

  /**
   * Delete expired files
   */
  async deleteExpiredFiles(): Promise<number> {
    return await this.execute(
      async () => {
        const res = await File.deleteMany({
          expiresAt: {$lt: new Date()},
        });
        return res.deletedCount || 0;
      }
    );
  }
}

// Export singleton instance
export const mongoRepository = new MongoRepository();
