/**
 * Conversation Repository Interface
 * Contract for conversation data access
 */

import { Conversation } from '../entities';
import { ConversationId } from '../value-objects';

export interface IConversationRepository {
  /**
   * Create a new conversation
   */
  create(conversation: Conversation): Promise<Conversation>;

  /**
   * Find conversation by ID
   */
  findById(id: ConversationId): Promise<Conversation | null>;

  /**
   * Find all conversations
   */
  findAll(userId?: string, limit?: number): Promise<Conversation[]>;

  /**
   * Update conversation
   */
  update(conversation: Conversation): Promise<void>;

  /**
   * Delete conversation
   */
  delete(id: ConversationId): Promise<void>;

  /**
   * Search conversations by title or metadata
   */
  search(query: string, userId?: string, limit?: number): Promise<Conversation[]>;

  /**
   * Check if conversation exists
   */
  exists(id: ConversationId): Promise<boolean>;

  /**
   * Find or create conversation (atomic operation)
   */
  findOrCreate(conversation: Conversation): Promise<Conversation>;
}
