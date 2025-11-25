/**
 * Message DTOs
 * Data Transfer Objects for message operations
 */

export interface MessageDTO {
  messageId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  displayContent?: string;
  fileIds?: string[];
  toolCalls?: ToolCallDTO[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ToolCallDTO {
  toolName: string;
  toolCallId: string;
  args: any;
  result?: any;
}

export interface ConversationHistoryDTO {
  conversationId: string;
  messages: MessageDTO[];
  totalCount: number;
}
