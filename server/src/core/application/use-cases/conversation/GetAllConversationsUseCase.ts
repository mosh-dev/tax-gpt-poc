/**
 * Get All Conversations Use Case
 * Retrieves list of conversations for a user
 */

import { IConversationRepository } from '../../../domain/repositories';
import { ConversationListDTO } from '../../dtos';

export class GetAllConversationsUseCase {
  constructor(private conversationRepository: IConversationRepository) {}

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
