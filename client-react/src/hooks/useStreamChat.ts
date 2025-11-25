/**
 * useStreamChat Hook
 * Handles SSE streaming chat logic and orchestrates stream processing
 */

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Message, StreamEvent, StreamContext, StreamEventResult } from '../types/common.types.ts';
import { apiService } from '../services/api';
import { STREAM_EVENT_TYPES, MESSAGE_ROLES } from '../constants/events.ts';
import { ERROR_MESSAGES } from '../constants/chatMessages';
import {
  handleConnectedEvent,
  handleChunkEvent,
  handleToolCallEvent,
  handleDoneEvent,
  handleErrorEvent,
  updateMessageAfterToolResult,
} from '../utils/chat/streamEventHandlers';
import { handleWorkflowToolResult } from '../utils/chat/workflowStreamHandlers';
import { routeToolResult } from '../utils/chat/toolResultRouter';
import type { TaxDataToolResult, StreamChatParams } from '../components/Chat/Chat.types';

interface UseStreamChatProps {
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setActiveWorkflow: Dispatch<SetStateAction<any>>;
  setIsWorkflowSubmitting: Dispatch<SetStateAction<boolean>>;
  setPendingToolResult: Dispatch<SetStateAction<TaxDataToolResult | null>>;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  isWorkflowSubmitting: boolean;
}

export const useStreamChat = ({
  setMessages,
  setIsLoading,
  setError,
  setActiveWorkflow,
  setIsWorkflowSubmitting,
  setPendingToolResult,
  setIsModalOpen,
  isWorkflowSubmitting,
}: UseStreamChatProps) => {
  const [isStreaming, setIsStreaming] = useState(false);

  const handleToolResult = (event: StreamEvent, assistantMessage: Message) => {
    routeToolResult(event, assistantMessage, {
      setPendingToolResult,
      setIsModalOpen,
    });
  };

  /**
   * Unified SSE streaming handler - consolidates all chat streaming logic
   * Orchestrates stream processing and delegates to specialized handlers
   */
  const streamChatMessage = async (params: StreamChatParams) => {
    const { content, threadId: threadIdToUse, fileIds, onConnected, agentMessage } = params;

    const assistantMessage: Message = {
      conversationId: threadIdToUse,
      role: MESSAGE_ROLES.ASSISTANT,
      content: '',
      createdAt: new Date().toISOString(),
    };

    let firstChunk = false;
    let streamCompleted = false;
    let hasError = false;

    try {
      setIsStreaming(true);

      // Create context for event handlers
      const context: StreamContext = {
        assistantMessage,
        firstChunk,
        setMessages,
        setIsLoading,
        setError,
      };

      const streamEvents = apiService.streamChat({
        message: content,
        threadId: threadIdToUse,
        fileIds: fileIds,
        agentMessage: agentMessage
      })

      for await (const event of streamEvents) {
        let result: StreamEventResult;

        switch (event.type) {
          case STREAM_EVENT_TYPES.CONNECTED:
            result = handleConnectedEvent(event, onConnected);
            break;

          case STREAM_EVENT_TYPES.CHUNK:
            result = handleChunkEvent(event, { ...context, firstChunk });
            if (result.firstChunk !== undefined) {
              firstChunk = result.firstChunk;
            }
            break;

          case STREAM_EVENT_TYPES.TOOL_CALL:
            result = handleToolCallEvent(event);
            break;

          case STREAM_EVENT_TYPES.TOOL_RESULT:
            // Generic tool handling (modals, PDF downloads, etc.)
            handleToolResult(event, assistantMessage);

            // Workflow-specific handling
            handleWorkflowToolResult(
              event,
              threadIdToUse,
              setActiveWorkflow,
              setIsWorkflowSubmitting
            );

            // Update message state after tool result
            firstChunk = updateMessageAfterToolResult(
              assistantMessage,
              firstChunk,
              setMessages,
              setIsLoading
            );
            result = { shouldContinue: true };
            break;

          case STREAM_EVENT_TYPES.DONE:
            streamCompleted = true;
            result = handleDoneEvent();
            break;

          case STREAM_EVENT_TYPES.ERROR:
            hasError = true;
            result = handleErrorEvent(event, { ...context, firstChunk });
            break;

          default:
            result = { shouldContinue: true };
        }

        // Check if we should abort
        if (result.shouldContinue === false) {
          break;
        }
      }

      // Handle case where stream completed but no content was received
      if (!firstChunk && streamCompleted && !hasError) {
        setError(ERROR_MESSAGES.NO_RESPONSE);
      }
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.FAILED_TO_SEND);
    } finally {
      // Clear loading state if no content was received
      if (!firstChunk) {
        setIsLoading(false);
      }
      setIsStreaming(false);

      // Safety: Clear workflow submitting state if not already cleared
      if (isWorkflowSubmitting) {
        setIsWorkflowSubmitting(false);
      }
    }
  };

  return {
    streamChatMessage,
    isStreaming,
  };
};
