/**
 * MongoDB Memory Service for Mastra Agent
 * Stores conversation history in MongoDB for persistence
 */

import { mongoRepository } from './mongo-repository';
import { MessageData } from '../models';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileIds?: string[];
  toolCalls?: Array<{
    toolName: string;
    toolCallId: string;
    args: any;
    result?: any;
  }>;
}

export class MongoDBMemory {
  /**
   * Generate a title from the first message (2-3 words)
   */
  private generateTitleFromMessage(message: string): string {
    // Remove special characters and extra whitespace
    const cleaned = message
      .replace(/\[.*?\]/g, '') // Remove [fileId: xxx] tags
      .replace(/[^\w\s]/g, ' ') // Replace special chars with space
      .trim()
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 0);

    if (cleaned.length === 0) {
      return 'New Conversation';
    }

    // Take first 3 words or fewer
    const titleWords = cleaned.slice(0, 3);
    const title = titleWords.join(' ');

    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  /**
   * Create or get existing conversation
   */
  async getOrCreateConversation(conversationId?: string, firstMessage?: string): Promise<string> {
    if (conversationId) {
      const existing = await mongoRepository.findConversationById(conversationId);
      if (existing) {
        return existing.conversationId;
      }
    }

    // Generate title from first message or use default
    const title = firstMessage
      ? this.generateTitleFromMessage(firstMessage)
      : 'New Conversation';

    // Create new conversation
    const conversation = await mongoRepository.createConversation({
      conversationId,
      title,
      metadata: {},
    });

    // If database is unavailable, generate a temporary ID
    if (!conversation) {
      console.warn('[MongoDBMemory] Database unavailable, using temporary conversation ID');
      return conversationId || 'temp-' + Date.now();
    }

    return conversation.conversationId;
  }

  /**
   * Save a message to conversation
   */
  async saveMessage(
    conversationId: string,
    message: ConversationMessage
  ): Promise<MessageData> {
    const msg = await mongoRepository.createMessage({
      conversationId,
      role: message.role,
      content: message.content,
      fileIds: message.fileIds || [],
      toolCalls: message.toolCalls || [],
      metadata: {},
    });

    if (!msg) {
      throw new Error('Failed to create message');
    }

    return msg;
  }

  /**
   * Get conversation history
   */
  async getHistory(conversationId: string, limit: number = 50): Promise<any[]> {
    const messages = await mongoRepository.getMessagesByConversationId(conversationId, limit);

    return messages.map((msg) => ({
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      fileIds: msg.fileIds,
      toolCalls: msg.toolCalls,
      createdAt: msg.createdAt?.toISOString() || new Date().toISOString(),
    }));
  }

  /**
   * Get conversation metadata
   */
  async getConversationMetadata(conversationId: string): Promise<any> {
    const conversation = await mongoRepository.findConversationById(conversationId);
    return conversation?.metadata || {};
  }

  /**
   * Update conversation metadata
   */
  async updateConversationMetadata(
    conversationId: string,
    metadata: any
  ): Promise<void> {
    await mongoRepository.updateConversation(conversationId, { metadata });
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    await mongoRepository.updateConversation(conversationId, { title });
  }

  /**
   * Get all conversations (for sidebar)
   */
  async getAllConversations(userId?: string, limit: number = 50): Promise<any[]> {
    return await mongoRepository.getAllConversations(userId, limit);
  }

  /**
   * Delete conversation and its messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await mongoRepository.deleteMessagesByConversationId(conversationId);
    await mongoRepository.deleteConversation(conversationId);
  }

  /**
   * Search conversations by query
   */
  async searchConversations(query: string, userId?: string, limit: number = 20): Promise<any[]> {
    return await mongoRepository.searchConversations(query, userId, limit);
  }
}

// Export singleton instance
export const mongoMemory = new MongoDBMemory();
