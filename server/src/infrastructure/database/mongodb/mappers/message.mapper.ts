/**
 * Message Mapper
 * Maps between domain entities and MongoDB models
 */


import { MessageData } from '@domains/conversation/models/message.model';
import { TaxGptMessage } from '@domains/conversation/entities/tax-gpt-message.class';
import { MessageId } from '@domains/conversation/value-objects/message-id.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { MessageRole } from '@domains/conversation/value-objects/message-role.class';
import { FileId } from '@domains/document/value-objects/file-id.class';

export class MessageMapper {
  /**
   * Map from domain entity to database model
   */
  static toPersistence(message: TaxGptMessage): Partial<MessageData> {
    return {
      conversationId: message.conversationId.value,
      role: message.role.toString() as 'user' | 'assistant' | 'system',
      content: message.content,
      displayContent: message.displayContent,
      fileIds: message.fileIds.map(id => id.value),
      toolCalls: message.toolCalls,
      metadata: message.metadata,
      createdAt: message.createdAt,
    };
  }

  /**
   * Map from database model to domain entity
   */
  static toDomain(data: MessageData): TaxGptMessage {
    // Generate a message ID since the database model doesn't store it separately
    // MongoDB _id will be used for uniqueness
    return new TaxGptMessage(
      MessageId.generate(), // Generate new ID for domain entity
      ConversationId.create(data.conversationId),
      MessageRole.fromString(data.role),
      data.content,
      data.displayContent,
      data.fileIds?.map(id => FileId.create(id)) || [],
      data.toolCalls || [],
      data.metadata || {},
      data.createdAt
    );
  }

  /**
   * Map array of database models to domain entities
   */
  static toDomainArray(dataArray: MessageData[]): TaxGptMessage[] {
    return dataArray.map(data => this.toDomain(data));
  }
}
