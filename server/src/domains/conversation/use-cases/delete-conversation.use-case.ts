import { MongoConversationRepository } from '@infrastructure/database/mongodb/repositories/mongo-conversation.repository';
import { MongoMessageRepository } from '@infrastructure/database/mongodb/repositories/mongo-message.repository';
import { MastraAIAgentService } from '@infrastructure/ai/mastra-ai-agent.service';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

export class DeleteConversationUseCase {
  private readonly conversationRepository = injectFromContainer(MongoConversationRepository);
  private readonly messageRepository = injectFromContainer(MongoMessageRepository);
  private readonly aiAgentService = injectFromContainer(MastraAIAgentService);
  private readonly logger = injectFromContainer(LoggerService);

  async execute(conversationId: string): Promise<void> {

    const convId = ConversationId.create(conversationId);

    // Check if conversation exists
    const exists = await this.conversationRepository.exists(convId);
    if (!exists) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    this.logger.log(`[DeleteConversationUseCase] Starting deletion for: ${conversationId}`);

    // Step 1: Delete custom MongoDB collections (messages first, then conversation)
    try {
      await this.messageRepository.deleteByConversationId(convId);
      this.logger.log(`[DeleteConversationUseCase] Deleted messages for: ${conversationId}`);
    } catch (error) {
      console.error(`[DeleteConversationUseCase] Error deleting messages:`, error);
      throw new Error(`Failed to delete messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      await this.conversationRepository.delete(convId);
      this.logger.log(`[DeleteConversationUseCase] Deleted conversation: ${conversationId}`);
    } catch (error) {
      console.error(`[DeleteConversationUseCase] Error deleting conversation:`, error);
      throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 2: Delete Mastra data (threads, messages, workflow snapshots)
    if (this.aiAgentService) {
      try {
        await this.aiAgentService.deleteThread(conversationId);
        this.logger.log(`[DeleteConversationUseCase] Deleted Mastra data for: ${conversationId}`);
      } catch (error) {
        console.error(`[DeleteConversationUseCase] Error deleting Mastra data:`, error);
        // Log error but don't throw - we want to continue even if Mastra cleanup fails
        this.logger.warn(`[DeleteConversationUseCase] Mastra cleanup failed, but custom collections were deleted`);
      }
    } else {
      this.logger.warn(`[DeleteConversationUseCase] AI Agent Service not available, skipping Mastra cleanup`);
    }

    this.logger.log(`[DeleteConversationUseCase] Completed deletion for: ${conversationId}`);
  }
}
