/**
 * Get Conversation History Use Case
 * Retrieves conversation with all messages
 */
import { MongoConversationRepository } from '@infrastructure/database/mongodb/repositories/mongo-conversation.repository';
import { ConversationHistoryDTO } from '@domains/conversation/dtos/message-dto';
import { MongoMessageRepository } from '@infrastructure/database/mongodb/repositories/mongo-message.repository';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { injectFromContainer } from '@/app/di-container/container-helper';


export class GetConversationHistoryUseCase {
  private conversationRepository = injectFromContainer(MongoConversationRepository);
  private messageRepository = injectFromContainer(MongoMessageRepository);

  async execute(conversationId: string, limit: number = 200): Promise<ConversationHistoryDTO> {
    const convId = ConversationId.create(conversationId);

    // Check if conversation exists
    const conversation = await this.conversationRepository.findById(convId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Get messages
    const messages = await this.messageRepository.findByConversationId(convId, limit);
    const messageCount = await this.messageRepository.countByConversationId(convId);

    return {
      conversationId,
      messages: messages.map(msg => ({
        messageId: msg.id.value,
        conversationId: msg.conversationId.value,
        role: msg.role.toString() as 'user' | 'assistant' | 'system',
        content: msg.content,
        displayContent: msg.displayContent,
        fileIds: msg.fileIds.map(id => id.value),
        toolCalls: msg.toolCalls,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
      })),
      totalCount: messageCount,
    };
  }
}
