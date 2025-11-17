/**
 * Message Mapper
 * Maps between domain entities and MongoDB models
 */

import { Message } from '../../../../core/domain';
import { MessageId, ConversationId, MessageRole, FileId } from '../../../../core/domain';
import { MessageData } from '../../../../models';

export class MessageMapper {
  /**
   * Map from domain entity to database model
   */
  static toPersistence(message: Message): Partial<MessageData> {
    return {
      conversationId: message.conversationId.value,
      role: message.role.toString() as 'user' | 'assistant' | 'system',
      content: message.content,
      fileIds: message.fileIds.map(id => id.value),
      toolCalls: message.toolCalls,
      metadata: message.metadata,
      createdAt: message.createdAt,
    };
  }

  /**
   * Map from database model to domain entity
   */
  static toDomain(data: MessageData): Message {
    // Generate a message ID since the database model doesn't store it separately
    // MongoDB _id will be used for uniqueness
    return new Message(
      MessageId.generate(), // Generate new ID for domain entity
      ConversationId.create(data.conversationId),
      MessageRole.fromString(data.role),
      data.content,
      data.fileIds?.map(id => FileId.create(id)) || [],
      data.toolCalls || [],
      data.metadata || {},
      data.createdAt
    );
  }

  /**
   * Map array of database models to domain entities
   */
  static toDomainArray(dataArray: MessageData[]): Message[] {
    return dataArray.map(data => this.toDomain(data));
  }
}
