/**
 * Conversation Repository Interface
 * Contract for conversation data access
 */
import { TaxGptConversation } from '@core/domain/entities/TaxGptConversation';
import { ConversationId } from '@core/domain/value-objects/ConversationId';

export interface IConversationRepository {
  /**
   * Create a new conversation
   */
  create(conversation: TaxGptConversation): Promise<TaxGptConversation>;

  /**
   * Find conversation by ID
   */
  findById(id: ConversationId): Promise<TaxGptConversation | null>;

  /**
   * Find all conversations
   */
  findAll(userId?: string, limit?: number): Promise<TaxGptConversation[]>;

  /**
   * Update conversation
   */
  update(conversation: TaxGptConversation): Promise<void>;

  /**
   * Delete conversation
   */
  delete(id: ConversationId): Promise<void>;

  /**
   * Search conversations by title or metadata
   */
  search(query: string, userId?: string, limit?: number): Promise<TaxGptConversation[]>;

  /**
   * Check if conversation exists
   */
  exists(id: ConversationId): Promise<boolean>;

  /**
   * Find or create conversation (atomic operation)
   */
  findOrCreate(conversation: TaxGptConversation): Promise<TaxGptConversation>;
}
