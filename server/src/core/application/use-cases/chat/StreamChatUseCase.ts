/**
 * Stream Chat Use Case
 * Handles streaming chat with AI agent
 */

import { IConversationRepository, IMessageRepository } from '../../../domain/repositories';
import { Conversation, Message } from '../../../domain/entities';
import { ConversationId, MessageId, MessageRole } from '../../../domain/value-objects';
import { StreamChatRequestDTO, StreamEventDTO, ChatMessageDTO } from '../../dtos';
import { IAIAgentService } from '../../services';

export class StreamChatUseCase {
  constructor(
    private conversationRepository: IConversationRepository,
    private messageRepository: IMessageRepository,
    private aiAgentService: IAIAgentService
  ) {}

  async *execute(request: StreamChatRequestDTO): AsyncIterable<StreamEventDTO> {
    // 1. Get or create conversation
    let conversationId: ConversationId;

    if (request.conversationId) {
      conversationId = ConversationId.create(request.conversationId);
      const existing = await this.conversationRepository.findById(conversationId);

      if (!existing) {
        // Create new conversation if ID provided but doesn't exist
        const newConversation = new Conversation(
          conversationId,
          'New Tax Conversation'
        );
        await this.conversationRepository.create(newConversation);
      }
    } else {
      // Create new conversation
      conversationId = ConversationId.generate();
      const newConversation = new Conversation(
        conversationId,
        'New Tax Conversation'
      );
      await this.conversationRepository.create(newConversation);
    }

    // 2. Save user message
    const userMessage = new Message(
      MessageId.generate(),
      conversationId,
      MessageRole.User(),
      request.message
    );
    await this.messageRepository.create(userMessage);

    // 3. Get conversation history
    const historyMessages = await this.messageRepository.findByConversationId(conversationId);
    const history: ChatMessageDTO[] = historyMessages.map(msg => ({
      role: msg.role.toString() as 'user' | 'assistant' | 'system',
      content: msg.content,
      fileIds: msg.fileIds.map(id => id.value),
      toolCalls: msg.toolCalls,
    }));

    // 4. Stream AI response
    let assistantContent = '';
    const toolCalls: any[] = [];

    try {
      // Send initial event with conversationId
      yield {
        type: 'connected',
        conversationId: conversationId.value,
        timestamp: new Date().toISOString(),
      };

      for await (const event of this.aiAgentService.streamChat(request.message, history)) {
        // Collect assistant response for saving
        if (event.type === 'text-delta' || event.type === 'chunk') {
          assistantContent += event.content || '';
        }

        // Collect tool calls
        if (event.type === 'tool-call' && event.toolName && event.toolCallId) {
          toolCalls.push({
            toolName: event.toolName,
            toolCallId: event.toolCallId,
            args: event.args,
          });
        }

        // Update tool results
        if (event.type === 'tool-result' && event.toolCallId) {
          const toolCall = toolCalls.find(tc => tc.toolCallId === event.toolCallId);
          if (toolCall) {
            toolCall.result = event.result;
          }
        }

        // Forward event to client
        yield {
          ...event,
          conversationId: conversationId.value,
          timestamp: event.timestamp || new Date().toISOString(),
        };
      }

      // 5. Save assistant message
      if (assistantContent.trim()) {
        const assistantMessage = new Message(
          MessageId.generate(),
          conversationId,
          MessageRole.Assistant(),
          assistantContent,
          [],
          toolCalls.length > 0 ? toolCalls : undefined
        );
        await this.messageRepository.create(assistantMessage);
      }
    } catch (error: any) {
      console.error('[StreamChatUseCase] Error:', error);
      yield {
        type: 'error',
        error: error.message || 'An error occurred during chat',
        conversationId: conversationId.value,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
