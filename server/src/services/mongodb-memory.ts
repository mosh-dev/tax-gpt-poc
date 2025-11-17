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
   * Create or get existing conversation
   */
  async getOrCreateConversation(conversationId?: string): Promise<string> {
    if (conversationId) {
      const existing = await mongoRepository.findConversationById(conversationId);
      if (existing) {
        return existing.conversationId;
      }
    }

    // Create new conversation
    const conversation = await mongoRepository.createConversation({
      conversationId,
      title: 'New Tax Conversation',
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
  async getHistory(conversationId: string, limit: number = 50): Promise<ConversationMessage[]> {
    const messages = await mongoRepository.getMessagesByConversationId(conversationId, limit);

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      fileIds: msg.fileIds,
      toolCalls: msg.toolCalls,
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
