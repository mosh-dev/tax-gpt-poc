/**
 * AI Agent Service Interface
 * Contract for AI agent interactions (kept separate from clean architecture)
 */

import { Message } from '../../domain/entities';

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
   * @param conversationHistory Conversation history (for legacy mode without Memory)
   * @param threadId Optional thread ID for Mastra Memory
   * @param resourceId Optional resource ID for Mastra Memory (e.g., user ID)
   */
  streamChat(
    message: string,
    conversationHistory: ChatMessage[],
    threadId?: string,
    resourceId?: string
  ): AsyncIterable<StreamEvent>;

  /**
   * Get single chat response (non-streaming)
   */
  chat(message: string, conversationHistory: ChatMessage[]): Promise<string>;

  /**
   * Delete a conversation thread from Mastra memory
   * This deletes all Mastra data (threads, messages, workflow snapshots)
   * @param threadId The thread ID to delete
   * @param resourceId Optional resource ID
   */
  deleteThread(threadId: string, resourceId?: string): Promise<void>;
}
