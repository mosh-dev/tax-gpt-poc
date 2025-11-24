/**
 * Message Repository Interface
 * Contract for message data access
 */
import { TaxGptMessage } from '@core/domain/entities/TaxGptMessage';
import { ConversationId } from '@core/domain/value-objects/ConversationId';
import { MessageId } from '@core/domain/value-objects/MessageId';


export interface IMessageRepository {
  /**
   * Create a new message
   */
  create(message: TaxGptMessage): Promise<TaxGptMessage>;

  /**
   * Find message by ID
   */
  findById(id: MessageId): Promise<TaxGptMessage | null>;

  /**
   * Find all messages for a conversation
   */
  findByConversationId(conversationId: ConversationId, limit?: number): Promise<TaxGptMessage[]>;

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
  getLatestByConversationId(conversationId: ConversationId): Promise<TaxGptMessage | null>;
}
