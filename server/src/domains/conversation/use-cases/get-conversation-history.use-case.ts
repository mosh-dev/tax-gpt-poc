/**
 * Get Conversation History Use Case
 * Retrieves conversation with all messages
 */
import { IConversationRepository } from '@infrastructure/database/mongodb/repositories/interfaces/conversation-repository.interface';
import { ConversationHistoryDTO } from '@domains/conversation/dtos/message-dto';
import { IMessageRepository } from '@infrastructure/database/mongodb/repositories/interfaces/message-repository.interface';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';


export class GetConversationHistoryUseCase {
  constructor(
    private conversationRepository: IConversationRepository,
    private messageRepository: IMessageRepository
  ) {}

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
