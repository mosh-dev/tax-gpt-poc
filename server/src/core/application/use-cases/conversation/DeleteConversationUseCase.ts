/**
 * Delete Conversation Use Case
 * Deletes conversation and all associated data:
 * - Custom MongoDB collections (messages, conversations)
 * - Mastra data (threads, messages, workflow snapshots)
 */
import { IConversationRepository } from '@core/domain/repositories/IConversationRepository';
import { IMessageRepository } from '@core/domain/repositories/IMessageRepository';
import { IAIAgentService } from '@core/application/services/IAIAgentService';
import { ConversationId } from '@core/domain/value-objects/ConversationId';

export class DeleteConversationUseCase {
  constructor(
    private conversationRepository: IConversationRepository,
    private messageRepository: IMessageRepository,
    private aiAgentService?: IAIAgentService
  ) {}

  async execute(conversationId: string): Promise<void> {
    const convId = ConversationId.create(conversationId);

    // Check if conversation exists
    const exists = await this.conversationRepository.exists(convId);
    if (!exists) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    console.log(`[DeleteConversationUseCase] Starting deletion for: ${conversationId}`);

    // Step 1: Delete custom MongoDB collections (messages first, then conversation)
    try {
      await this.messageRepository.deleteByConversationId(convId);
      console.log(`[DeleteConversationUseCase] Deleted messages for: ${conversationId}`);
    } catch (error) {
      console.error(`[DeleteConversationUseCase] Error deleting messages:`, error);
      throw new Error(`Failed to delete messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      await this.conversationRepository.delete(convId);
      console.log(`[DeleteConversationUseCase] Deleted conversation: ${conversationId}`);
    } catch (error) {
      console.error(`[DeleteConversationUseCase] Error deleting conversation:`, error);
      throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 2: Delete Mastra data (threads, messages, workflow snapshots)
    if (this.aiAgentService) {
      try {
        await this.aiAgentService.deleteThread(conversationId);
        console.log(`[DeleteConversationUseCase] Deleted Mastra data for: ${conversationId}`);
      } catch (error) {
        console.error(`[DeleteConversationUseCase] Error deleting Mastra data:`, error);
        // Log error but don't throw - we want to continue even if Mastra cleanup fails
        console.warn(`[DeleteConversationUseCase] Mastra cleanup failed, but custom collections were deleted`);
      }
    } else {
      console.warn(`[DeleteConversationUseCase] AI Agent Service not available, skipping Mastra cleanup`);
    }

    console.log(`[DeleteConversationUseCase] Completed deletion for: ${conversationId}`);
  }
}
