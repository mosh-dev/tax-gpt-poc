/**
 * Chat DTOs
 * Data Transfer Objects for chat operations
 */

export interface StreamChatRequestDTO {
  message: string;
  userMessage: string;
  conversationId?: string;
  conversationHistory?: ChatMessageDTO[];
  userId?: string; // Optional user ID for Mastra Memory resource scoping
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
