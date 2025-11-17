/**
 * MongoDB Repository Service
 * Centralized data access layer for all database operations
 * Provides abstraction over Mongoose models
 */

import { Conversation, Message, File, IConversation, IMessage, IFile } from '../models';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';

export interface ConversationData {
  conversationId?: string;
  title: string;
  taxYear?: number;
  userId?: string;
  metadata?: any;
}

export interface MessageData {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileIds?: string[];
  toolCalls?: any[];
  metadata?: any;
}

export interface FileData {
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
    return mongoose.connection.readyState === 1;
  }

  /**
   * Handle database operation with connection check
   */
  private async execute<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.isConnected()) {
      console.warn('[MongoRepository] Database not connected, returning fallback value');
      return fallback;
    }

    try {
      return await operation();
    } catch (error) {
      console.error('[MongoRepository] Database operation failed:', error);
      return fallback;
    }
  }

  // ==================== Conversation Operations ====================

  /**
   * Create a new conversation
   */
  async createConversation(data: ConversationData): Promise<IConversation | null> {
    const conversationId = data.conversationId || randomUUID();
    return this.execute(
      async () => await Conversation.create({
        conversationId,
        title: data.title || 'New Tax Conversation',
        taxYear: data.taxYear,
        userId: data.userId,
        metadata: data.metadata || {},
      }),
      null
    );
  }

  /**
   * Find conversation by ID
   */
  async findConversationById(conversationId: string): Promise<IConversation | null> {
    return this.execute(
      async () => await Conversation.findOne({ conversationId }).lean(),
      null
    );
  }

  /**
   * Get all conversations
   */
  async getAllConversations(userId?: string, limit: number = 50): Promise<IConversation[]> {
    const query = userId ? { userId } : {};
    return this.execute(
      async () => await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      []
    );
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<ConversationData>
  ): Promise<void> {
    await this.execute(
      async () => {
        await Conversation.updateOne({ conversationId }, { $set: updates });
      },
      undefined
    );
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.execute(
      async () => {
        await Conversation.deleteOne({ conversationId });
      },
      undefined
    );
  }

  /**
   * Search conversations
   */
  async searchConversations(
    query: string,
    userId?: string,
    limit: number = 20
  ): Promise<IConversation[]> {
    const searchQuery: any = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { 'metadata.tags': { $regex: query, $options: 'i' } },
      ],
    };

    if (userId) {
      searchQuery.userId = userId;
    }

    return this.execute(
      async () => await Conversation.find(searchQuery)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      []
    );
  }

  // ==================== Message Operations ====================

  /**
   * Create a new message
   */
  async createMessage(data: MessageData): Promise<IMessage | null> {
    return this.execute(
      async () => await Message.create({
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        fileIds: data.fileIds || [],
        toolCalls: data.toolCalls || [],
        metadata: data.metadata || {},
      }),
      null
    );
  }

  /**
   * Get messages for a conversation
   */
  async getMessagesByConversationId(
    conversationId: string,
    limit: number = 200
  ): Promise<IMessage[]> {
    return this.execute(
      async () => await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean(),
      []
    );
  }

  /**
   * Delete all messages for a conversation
   */
  async deleteMessagesByConversationId(conversationId: string): Promise<void> {
    await this.execute(
      async () => {
        await Message.deleteMany({ conversationId });
      },
      undefined
    );
  }

  // ==================== File Operations ====================

  /**
   * Create a new file record
   */
  async createFile(data: FileData): Promise<IFile | null> {
    return this.execute(
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
      }),
      null
    );
  }

  /**
   * Find file by ID
   */
  async findFileById(fileId: string): Promise<IFile | null> {
    return this.execute(
      async () => await File.findOne({ fileId }).lean(),
      null
    );
  }

  /**
   * Update file
   */
  async updateFile(fileId: string, updates: Partial<FileData>): Promise<void> {
    await this.execute(
      async () => {
        await File.updateOne({ fileId }, { $set: updates });
      },
      undefined
    );
  }

  /**
   * Mark file as processed
   */
  async markFileAsProcessed(fileId: string, ocrResult?: any): Promise<void> {
    const updateData: any = { processed: true };
    if (ocrResult) {
      updateData.ocrResult = ocrResult;
    }
    await this.execute(
      async () => {
        await File.updateOne({ fileId }, { $set: updateData });
      },
      undefined
    );
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.execute(
      async () => {
        await File.deleteOne({ fileId });
      },
      undefined
    );
  }

  /**
   * Get files by conversation ID
   */
  async getFilesByConversationId(conversationId: string): Promise<IFile[]> {
    return this.execute(
      async () => await File.find({ conversationId })
        .sort({ uploadedAt: -1 })
        .lean(),
      []
    );
  }

  /**
   * Find expired files
   */
  async findExpiredFiles(): Promise<IFile[]> {
    return this.execute(
      async () => await File.find({
        expiresAt: { $lt: new Date() },
      }).lean(),
      []
    );
  }

  /**
   * Delete expired files
   */
  async deleteExpiredFiles(): Promise<number> {
    return this.execute(
      async () => {
        const result = await File.deleteMany({
          expiresAt: { $lt: new Date() },
        });
        return result.deletedCount || 0;
      },
      0
    );
  }
}

// Export singleton instance
export const mongoRepository = new MongoRepository();
