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
   */
  streamChat(
    message: string,
    conversationHistory: ChatMessage[]
  ): AsyncIterable<StreamEvent>;

  /**
   * Get single chat response (non-streaming)
   */
  chat(message: string, conversationHistory: ChatMessage[]): Promise<string>;
}
