/**
 * Get All Conversations Use Case
 * Retrieves list of conversations for a user
 */
import { injectable } from 'tsyringe';
import { MongoConversationRepository } from '@infrastructure/database/mongodb/repositories/mongo-conversation.repository';
import { ConversationListDTO } from '@domains/conversation/dtos/conversation-dto';

@injectable()
export class GetAllConversationsUseCase {
  constructor(private conversationRepository: MongoConversationRepository) {}

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
