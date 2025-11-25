import type { Message } from '../../types/common.types';
import type React from 'react';

/**
 * Context passed to stream event handlers containing current streaming state
 */
export interface StreamContext {
  assistantMessage: Message;
  firstChunk: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Result returned by event handlers indicating state changes
 */
export interface StreamEventResult {
  firstChunk?: boolean;  // Update firstChunk flag if needed
  shouldContinue?: boolean;  // False to abort stream
}