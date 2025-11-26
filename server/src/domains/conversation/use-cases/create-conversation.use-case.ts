/**
 * Create Conversation Use Case
 * Creates a new conversation
 */
import { IConversationRepository } from '@infrastructure/database/mongodb/repositories/interfaces/conversation-repository.interface';
import { ConversationDTO, CreateConversationDTO } from '@domains/conversation/dtos/conversation-dto';
import { TaxGptConversation } from '@domains/conversation/entities/tax-gpt-conversation.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';

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
