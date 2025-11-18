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
      // Send initial event with threadId (for client compatibility)
      yield {
        type: 'connected',
        threadId: conversationId.value,
        conversationId: conversationId.value,
        timestamp: new Date().toISOString(),
      };

      // Use conversationId as threadId for Mastra Memory
      const threadId = conversationId.value;
      // resourceId is required by Mastra Memory - use default if not provided
      const resourceId = request.userId || 'default-user';

      for await (const event of this.aiAgentService.streamChat(
        request.message,
        history,
        threadId,
        resourceId
      )) {
        // Map Mastra events to client-expected format
        const eventType = event.type as string;

        switch (eventType) {
          case 'text-delta': {
            // Extract text content from various possible locations
            const textContent = event.content || (event as any).payload?.text || (event as any).textDelta || '';
            assistantContent += textContent;

            // Map to 'chunk' type for client
            yield {
              type: 'chunk',
              content: textContent,
              conversationId: conversationId.value,
              timestamp: new Date().toISOString(),
            };
            break;
          }

          case 'tool-call': {
            const toolName = event.toolName || (event as any).payload?.toolName;
            const toolCallId = event.toolCallId || (event as any).payload?.toolCallId;
            const args = event.args || (event as any).payload?.args;

            if (toolName && toolCallId) {
              toolCalls.push({ toolName, toolCallId, args });
            }

            yield {
              type: 'tool-call',
              toolName,
              toolCallId,
              args,
              conversationId: conversationId.value,
              timestamp: new Date().toISOString(),
            };
            break;
          }

          case 'tool-result': {
            const toolCallId = event.toolCallId || (event as any).payload?.toolCallId;
            const result = event.result || (event as any).payload?.result;
            const toolName = event.toolName || (event as any).payload?.toolName;

            if (toolCallId) {
              const toolCall = toolCalls.find(tc => tc.toolCallId === toolCallId);
              if (toolCall) {
                toolCall.result = result;
              }
            }

            yield {
              type: 'tool-result',
              toolCallId,
              toolName,
              result,
              conversationId: conversationId.value,
              timestamp: new Date().toISOString(),
            };
            break;
          }

          case 'finish': {
            yield {
              type: 'done',
              conversationId: conversationId.value,
              timestamp: new Date().toISOString(),
            };
            break;
          }

          case 'error': {
            yield {
              type: 'error',
              error: event.error || (event as any).payload?.error || 'Unknown error',
              conversationId: conversationId.value,
              timestamp: new Date().toISOString(),
            };
            break;
          }

          // Ignore other event types (reasoning, step-start, etc.)
          default:
            break;
        }
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
