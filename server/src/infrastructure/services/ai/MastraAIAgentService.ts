/**
 * Mastra AI Agent Service Adapter
 * Implements IAIAgentService using the existing TaxAgent
 */



import { ChatMessage, IAIAgentService, StreamEvent } from '@core/application/services/IAIAgentService';
import { getOrCreateTaxAgent } from '@agent/setup';

export class MastraAIAgentService implements IAIAgentService {
  async *streamChat(
    message: string,
    conversationHistory: ChatMessage[],
    threadId?: string,
    resourceId?: string
  ): AsyncIterable<StreamEvent> {
    // threadId is now REQUIRED by TaxAgent
    if (!threadId) {
      throw new Error('threadId is required for conversation management');
    }

    // Get or create tax agent with fresh instructions from DB
    const taxAgent = await getOrCreateTaxAgent();

    // Stream from tax agent (threadId is mandatory)
    for await (const event of taxAgent.streamChatWithTools(
      message,
      threadId,
      resourceId
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

  async deleteThread(threadId: string, resourceId?: string): Promise<void> {
    // Get or create tax agent
    const taxAgent = await getOrCreateTaxAgent();

    // Delegate to TaxAgent's deleteThread method
    // This will delete both Mastra data (threads, messages) and workflow snapshots
    await taxAgent.deleteThread(threadId, resourceId);
  }
}
