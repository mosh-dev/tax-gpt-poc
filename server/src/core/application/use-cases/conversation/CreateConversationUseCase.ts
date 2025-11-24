/**
 * Create Conversation Use Case
 * Creates a new conversation
 */
import { IConversationRepository } from '@core/domain/repositories/IConversationRepository';
import { ConversationDTO, CreateConversationDTO } from '@core/application/dtos/ConversationDTO';
import { TaxGptConversation } from '@core/domain/entities/TaxGptConversation';
import { ConversationId } from '@core/domain/value-objects/ConversationId';

export class CreateConversationUseCase {
  constructor(private conversationRepository: IConversationRepository) {}

  async execute(data: CreateConversationDTO): Promise<ConversationDTO> {
    // Create domain entity
    const conversation = new TaxGptConversation(
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
