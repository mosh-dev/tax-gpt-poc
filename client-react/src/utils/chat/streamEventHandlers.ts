import type { Message, StreamEvent } from '../../types/common.types';
import type { StreamContext, StreamEventResult } from './types';

/**
 * Handle CONNECTED event
 * Calls onConnected callback with threadId from server
 */
export function handleConnectedEvent(
  event: StreamEvent,
  onConnected?: (threadId?: string) => void
): StreamEventResult {
  console.log('[Chat] Connected with threadId:', event.threadId);
  onConnected?.(event.threadId);
  return { shouldContinue: true };
}

/**
 * Handle CHUNK event
 * Accumulates content chunks and updates message state
 */
export function handleChunkEvent(
  event: StreamEvent,
  context: StreamContext
): StreamEventResult {
  const { assistantMessage, firstChunk, setMessages, setIsLoading } = context;

  if (event.content) {
    assistantMessage.content += event.content;

    if (!firstChunk && assistantMessage.content.trim().length > 0) {
      // First chunk with visible content - add message and clear loader
      setMessages(prev => [...prev, { ...assistantMessage }]);
      setIsLoading(false);
      return { firstChunk: true, shouldContinue: true };
    } else if (firstChunk) {
      // Subsequent chunks - update existing message
      setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
    }
  }

  return { shouldContinue: true };
}

/**
 * Handle TOOL_CALL event
 * Currently just logs the tool call
 */
export function handleToolCallEvent(
  event: StreamEvent
): StreamEventResult {
  console.log('Tool called:', event.toolName);
  return { shouldContinue: true };
}

/**
 * Handle DONE event
 * Marks stream as completed
 */
export function handleDoneEvent(): StreamEventResult {
  console.log('Stream completed');
  return { shouldContinue: true };
}

/**
 * Handle ERROR event
 * Sets error state and aborts stream
 */
export function handleErrorEvent(
  event: StreamEvent,
  context: StreamContext
): StreamEventResult {
  context.setError(event.error || 'Stream error occurred');
  return { shouldContinue: false };
}

/**
 * Update message in state after tool result
 * Only adds/updates message if there's visible content
 *
 * @returns Updated firstChunk flag
 */
export function updateMessageAfterToolResult(
  assistantMessage: Message,
  firstChunk: boolean,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
): boolean {
  if (!firstChunk && assistantMessage.content.trim().length > 0) {
    setMessages(prev => [...prev, { ...assistantMessage }]);
    setIsLoading(false);
    return true; // Now has content
  } else if (firstChunk) {
    setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
  }
  return firstChunk;
}