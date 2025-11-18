// Types and interfaces for the application

export interface Conversation {
  conversationId: string;
  title: string;
  taxYear?: number;
  userId?: string;
  metadata: {
    location?: string;
    permitType?: string;
    maritalStatus?: string;
    employmentType?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileIds?: string[];
  toolCalls?: Array<{
    toolName: string;
    toolCallId: string;
    args: any;
    result?: any;
  }>;
  metadata?: {
    reasoning?: string;
    confidence?: number;
    [key: string]: any;
  };
  createdAt: string;
  // For UI rendering
  buttonResponse?: string;
  buttons?: Array<{
    label: string;
    value: string;
  }>;
}

export interface FileMetadata {
  fileId: string;
  originalName: string;
  storedPath: string;
  url: string;
  mimeType: string;
  size: number;
  processed: boolean;
  ocrResult?: {
    text: string;
    language: string;
    confidence?: number;
    wordCount: number;
  };
  uploadedAt: string;
  expiresAt?: string;
  conversationId?: string;
}

export type StreamEventType =
  | 'connected'
  | 'chunk'
  | 'reasoning'
  | 'reasoning-finish'
  | 'step-finish'
  | 'text-finish'
  | 'tool-call'
  | 'tool-result'
  | 'done'
  | 'error'
  | 'unknown';

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp: string;
  eventType?: string;
  raw?: any;
  threadId?: string; // For 'connected' event
}
