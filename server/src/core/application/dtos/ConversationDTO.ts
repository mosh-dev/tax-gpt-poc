/**
 * Conversation DTOs
 * Data Transfer Objects for conversation operations
 */

export interface ConversationDTO {
  conversationId: string;
  title: string;
  taxYear?: number;
  userId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationDTO {
  conversationId?: string;
  title: string;
  taxYear?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateConversationDTO {
  title?: string;
  taxYear?: number;
  metadata?: Record<string, any>;
}

export interface ConversationListDTO {
  conversationId: string;
  title: string;
  taxYear?: number;
  createdAt: Date;
  updatedAt: Date;
}
