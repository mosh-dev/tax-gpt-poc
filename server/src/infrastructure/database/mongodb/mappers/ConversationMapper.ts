/**
 * Conversation Mapper
 * Maps between domain entities and MongoDB models
 */

import { ConversationData } from '@models/conversation.model';
import { TaxGptConversation } from '@core/domain/entities/TaxGptConversation';
import { ConversationId } from '@core/domain/value-objects/ConversationId';

export class ConversationMapper {
  /**
   * Map from domain entity to database model
   */
  static toPersistence(conversation: TaxGptConversation): Partial<ConversationData> {
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
  static toDomain(data: ConversationData): TaxGptConversation {
    return new TaxGptConversation(
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
  static toDomainArray(dataArray: ConversationData[]): TaxGptConversation[] {
    return dataArray.map(data => this.toDomain(data));
  }
}
