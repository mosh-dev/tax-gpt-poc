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

/**
 * File Attachment Formatting
 * Templates for displaying and transmitting file attachments
 */
export const FILE_ATTACHMENT_FORMAT = {
  // Format for user-visible display message
  USER_DISPLAY: (fileNames: string) => `\n\nAttached: ${fileNames}`,

  // Format for agent message with file IDs
  AGENT_MARKERS: (fileIds: string[]) =>
    `\n\n[Uploaded Files]\n${fileIds.map(id => `[fileId: ${id}]`).join('\n')}`,
} as const;
