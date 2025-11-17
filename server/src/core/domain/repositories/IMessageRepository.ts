/**
 * Message Repository Interface
 * Contract for message data access
 */

import { Message } from '../entities';
import { MessageId, ConversationId } from '../value-objects';

export interface IMessageRepository {
  /**
   * Create a new message
   */
  create(message: Message): Promise<Message>;

  /**
   * Find message by ID
   */
  findById(id: MessageId): Promise<Message | null>;

  /**
   * Find all messages for a conversation
   */
  findByConversationId(conversationId: ConversationId, limit?: number): Promise<Message[]>;

  /**
   * Delete message
   */
  delete(id: MessageId): Promise<void>;

  /**
   * Delete all messages for a conversation
   */
  deleteByConversationId(conversationId: ConversationId): Promise<void>;

  /**
   * Count messages in a conversation
   */
  countByConversationId(conversationId: ConversationId): Promise<number>;

  /**
   * Get latest message in a conversation
   */
  getLatestByConversationId(conversationId: ConversationId): Promise<Message | null>;
}
