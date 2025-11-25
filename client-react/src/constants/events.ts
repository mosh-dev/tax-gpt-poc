/**
 * Stream Event Types
 * Constants for SSE streaming events from the backend
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