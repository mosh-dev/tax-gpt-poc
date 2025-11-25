/**
 * AI Agent Service Interface
 * Contract for AI agent interactions (kept separate from clean architecture)
 */

export interface StreamEvent {
  type: string;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp: string;
  [key: string]: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileIds?: string[];
  toolCalls?: any[];
}

export interface IAIAgentService {
  /**
   * Stream chat response with tool calling support
   * @param message User's message
   * @param threadId Optional thread ID for Mastra Memory
   * @param resourceId Optional resource ID for Mastra Memory (e.g., user ID)
   */
  streamChat(message: string, threadId?: string, resourceId?: string): AsyncIterable<StreamEvent>;

  /**
   * Delete a conversation thread from Mastra memory
   * This deletes all Mastra data (threads, messages, workflow snapshots)
   * @param threadId The thread ID to delete
   * @param resourceId Optional resource ID
   */
  deleteThread(threadId: string, resourceId?: string): Promise<void>;
}
