/**
 * Message Repository Interface
 * Contract for message data access
 */
import { TaxGptMessage } from '@domains/conversation/entities/tax-gpt-message.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { MessageId } from '@domains/conversation/value-objects/message-id.class';


export interface IMessageRepository {
  create(message: TaxGptMessage): Promise<TaxGptMessage>;
  findById(id: MessageId): Promise<TaxGptMessage | null>;
  findByConversationId(conversationId: ConversationId, limit?: number): Promise<TaxGptMessage[]>;
  delete(id: MessageId): Promise<void>;
  deleteByConversationId(conversationId: ConversationId): Promise<void>;
  countByConversationId(conversationId: ConversationId): Promise<number>;
  getLatestByConversationId(conversationId: ConversationId): Promise<TaxGptMessage | null>;
}
