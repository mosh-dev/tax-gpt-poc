/**
 * Delete Conversation Use Case
 * Deletes conversation and all associated messages
 */

import { IConversationRepository, IMessageRepository } from '../../../domain';
import { ConversationId } from '../../../domain';

export class DeleteConversationUseCase {
  constructor(
    private conversationRepository: IConversationRepository,
    private messageRepository: IMessageRepository
  ) {}

  async execute(conversationId: string): Promise<void> {
    const convId = ConversationId.create(conversationId);

    // Check if conversation exists
    const exists = await this.conversationRepository.exists(convId);
    if (!exists) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Delete messages first
    await this.messageRepository.deleteByConversationId(convId);

    // Delete conversation
    await this.conversationRepository.delete(convId);
  }
}
