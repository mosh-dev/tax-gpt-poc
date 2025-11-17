/**
 * Chat DTOs
 * Data Transfer Objects for chat operations
 */

import { MessageDTO } from './MessageDTO';

export interface StreamChatRequestDTO {
  message: string;
  conversationId?: string;
  conversationHistory?: ChatMessageDTO[];
}

export interface ChatMessageDTO {
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileIds?: string[];
  toolCalls?: any[];
}

export interface StreamEventDTO {
  type: string;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp: string;
  conversationId?: string;
  [key: string]: any;
}

export interface ChatResponseDTO {
  conversationId: string;
  message: string;
  messageId: string;
  timestamp: Date;
}
