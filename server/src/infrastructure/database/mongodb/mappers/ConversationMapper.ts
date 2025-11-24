/**
 * Conversation Mapper
 * Maps between domain entities and MongoDB models
 */

import { Conversation } from '@core/domain/entities';
import { ConversationId } from '@core/domain/value-objects';
import { ConversationData } from '@models/conversation.model';

export class ConversationMapper {
  /**
   * Map from domain entity to database model
   */
  static toPersistence(conversation: Conversation): Partial<ConversationData> {
    return {
      conversationId: conversation.id.value,
      title: conversation.title,
      taxYear: conversation.taxYear,
      userId: conversation.userId,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Map from database model to domain entity
   */
  static toDomain(data: ConversationData): Conversation {
    return new Conversation(
      ConversationId.create(data.conversationId),
      data.title,
      data.taxYear,
      data.userId,
      data.metadata,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Map array of database models to domain entities
   */
  static toDomainArray(dataArray: ConversationData[]): Conversation[] {
    return dataArray.map(data => this.toDomain(data));
  }
}
