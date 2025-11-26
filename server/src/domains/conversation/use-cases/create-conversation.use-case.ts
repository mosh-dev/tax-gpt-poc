/**
 * Create Conversation Use Case
 * Creates a new conversation
 */
import { MongoConversationRepository } from '@infrastructure/database/mongodb/repositories/mongo-conversation.repository';
import { ConversationDTO, CreateConversationDTO } from '@domains/conversation/dtos/conversation-dto';
import { TaxGptConversation } from '@domains/conversation/entities/tax-gpt-conversation.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { injectFromContainer } from '@/app/di-container/container-helper';

export class CreateConversationUseCase {
  private conversationRepository = injectFromContainer(MongoConversationRepository);

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
