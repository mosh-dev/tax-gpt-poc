/**
 * Chat UI Messages and Strings
 * Centralized constants for chat interface text
 */

export const CHAT_PLACEHOLDERS = {
  WORKFLOW_ACTIVE: 'Complete workflow step first...',
  DEFAULT: 'Type your message...',
} as const;

export const ERROR_MESSAGES = {
  NO_RESPONSE: 'No response received from assistant',
  FAILED_TO_SEND: 'Failed to send message',
  UPLOAD_FAILED: (message: string) => `Upload failed: ${message}`,
} as const;
