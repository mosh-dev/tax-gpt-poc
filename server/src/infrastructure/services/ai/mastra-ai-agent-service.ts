import { IAIAgentService, StreamEvent } from '@core/application/services/IAIAgentService';
import { getOrCreateTaxAgent } from '@/mastra/agents/tax-agent/tax-agent.handler';

export class MastraAIAgentService implements IAIAgentService {
  async* streamChat(message: string, threadId: string, resourceId?: string): AsyncIterable<StreamEvent> {
    if (!threadId) {
      throw new Error('threadId is required for conversation management');
    }

    const taxAgent = await getOrCreateTaxAgent();

    // Stream from tax agent (threadId is mandatory)
    for await (const event of taxAgent.streamChatWithTools(message, threadId, resourceId)) {
      const mappedEvent: StreamEvent = {
        timestamp: new Date().toISOString(),
        ...event,
      };

      yield mappedEvent;
    }
  }

  async deleteThread(threadId: string, resourceId?: string): Promise<void> {
    const taxAgent = await getOrCreateTaxAgent();
    await taxAgent.deleteThread(threadId, resourceId);
  }
}
