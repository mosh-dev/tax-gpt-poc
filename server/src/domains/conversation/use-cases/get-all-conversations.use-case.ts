/**
 * Get All Conversations Use Case
 * Retrieves list of conversations for a user
 */
import { MongoConversationRepository } from '@infrastructure/database/mongodb/repositories/mongo-conversation.repository';
import { ConversationListDTO } from '@domains/conversation/dtos/conversation-dto';
import { injectFromContainer } from '@/app/di-container/container-helper';

export class GetAllConversationsUseCase {
  private conversationRepository = injectFromContainer(MongoConversationRepository);

  async execute(userId?: string, limit: number = 50): Promise<ConversationListDTO[]> {
    const conversations = await this.conversationRepository.findAll(userId, limit);

    return conversations.map(conv => ({
      conversationId: conv.id.value,
      title: conv.title,
      taxYear: conv.taxYear,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));
  }
}
