/**
 * Mastra AI Agent Service Adapter
 * Implements IAIAgentService using the existing TaxAgent
 */

import { IAIAgentService, StreamEvent, ChatMessage } from '../../../core/application/services';
import { TaxAgent } from '../../../agent';

export class MastraAIAgentService implements IAIAgentService {
  private taxAgent: TaxAgent;

  constructor() {
    this.taxAgent = new TaxAgent();
  }

  async *streamChat(
    message: string,
    conversationHistory: ChatMessage[],
    threadId?: string,
    resourceId?: string
  ): AsyncIterable<StreamEvent> {
    // Convert application ChatMessage to format expected by TaxAgent (for legacy mode)
    const historyForAgent = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
      fileIds: msg.fileIds,
      toolCalls: msg.toolCalls,
    }));

    // Stream from tax agent (supports both Memory and legacy modes)
    for await (const event of this.taxAgent.streamChatWithTools(
      message,
      threadId,
      resourceId,
      historyForAgent
    )) {
      // Map event to StreamEvent format
      const mappedEvent: StreamEvent = {
        type: event.type || 'unknown',
        timestamp: new Date().toISOString(),
        ...event,
      };

      yield mappedEvent;
    }
  }

  async chat(message: string, conversationHistory: ChatMessage[]): Promise<string> {
    // Not implemented yet - would use agent.generate() instead of stream
    throw new Error('Non-streaming chat not implemented yet');
  }
}
