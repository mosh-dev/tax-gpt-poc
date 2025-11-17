/**
 * Create Conversation Use Case
 * Creates a new conversation
 */

import { IConversationRepository } from '../../../domain/repositories';
import { Conversation } from '../../../domain/entities';
import { ConversationId } from '../../../domain/value-objects';
import { CreateConversationDTO, ConversationDTO } from '../../dtos';

export class CreateConversationUseCase {
  constructor(private conversationRepository: IConversationRepository) {}

  async execute(data: CreateConversationDTO): Promise<ConversationDTO> {
    // Create domain entity
    const conversation = new Conversation(
      data.conversationId ? ConversationId.create(data.conversationId) : ConversationId.generate(),
      data.title,
      data.taxYear,
      data.userId,
      data.metadata || {}
    );

    // Persist
    const saved = await this.conversationRepository.create(conversation);

    // Return DTO
    return {
      conversationId: saved.id.value,
      title: saved.title,
      taxYear: saved.taxYear,
      userId: saved.userId,
      metadata: saved.metadata,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
