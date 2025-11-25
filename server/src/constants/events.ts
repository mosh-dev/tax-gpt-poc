/**
 * Stream Event Types
 * Constants for SSE streaming events sent to the client
 */
export const STREAM_EVENT_TYPES = {
  CONNECTED: 'connected',
  CHUNK: 'chunk',
  TOOL_CALL: 'tool-call',
  TOOL_RESULT: 'tool-result',
  DONE: 'done',
  ERROR: 'error',
} as const;

export type StreamEventType = typeof STREAM_EVENT_TYPES[keyof typeof STREAM_EVENT_TYPES];

/**
 * Mastra Event Types
 * Event types received from Mastra AI framework
 */
export const MASTRA_EVENT_TYPES = {
  TEXT_DELTA: 'text-delta',
  TOOL_CALL: 'tool-call',
  TOOL_RESULT: 'tool-result',
  FINISH: 'finish',
  ERROR: 'error',
} as const;

export type MastraEventType = typeof MASTRA_EVENT_TYPES[keyof typeof MASTRA_EVENT_TYPES];

/**
 * Message Role Types
 * Constants for message roles in conversations
 */
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;

export type MessageRole = typeof MESSAGE_ROLES[keyof typeof MESSAGE_ROLES];