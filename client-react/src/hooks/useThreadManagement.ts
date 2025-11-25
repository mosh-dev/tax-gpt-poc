/**
 * useThreadManagement Hook
 * Handles thread loading, initial message sending, and thread transitions
 */

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useLocation } from 'react-router-dom';
import type { Message, WorkflowStatus } from '../types/common.types';

interface LocationState {
  initialMessage?: string;
  files?: File[];
}

interface WorkflowState {
  active: WorkflowStatus | null;
  isSubmitting: boolean;
}

interface UseThreadManagementProps {
  threadId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setWorkflowState: Dispatch<SetStateAction<WorkflowState>>;
  loadConversation: () => Promise<void>;
  sendInitialMessage: (message: string, files: File[]) => Promise<void>;
}

/**
 * Manages thread lifecycle: loading conversations and sending initial messages
 * Handles location state for initial messages from navigation
 * Prevents double execution in React StrictMode
 */
export const useThreadManagement = ({
  threadId,
  setMessages,
  setWorkflowState,
  loadConversation,
  sendInitialMessage,
}: UseThreadManagementProps) => {
  const location = useLocation();
  const initialMessageSentRef = useRef<string | null>(null);
  const loadedThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    const state = location.state as LocationState | null;

    // Check if this is a new conversation with initial message
    // Use ref to prevent double execution in React StrictMode
    if (state?.initialMessage && initialMessageSentRef.current !== threadId) {
      initialMessageSentRef.current = threadId;
      loadedThreadIdRef.current = threadId; // Mark as loaded to prevent loadConversation

      // Clear the location state to prevent re-sending on refresh
      window.history.replaceState({}, document.title);

      // Don't load conversation - we're about to send the first message
      setMessages([]);
      setWorkflowState({ active: null, isSubmitting: false });

      // Send the initial message (agent will detect workflow intent from message)
      sendInitialMessage(state.initialMessage, state.files || []).then();
    } else if (!state?.initialMessage && loadedThreadIdRef.current !== threadId) {
      // Normal conversation load (no initial message)
      // Use ref to prevent double execution in React StrictMode
      loadedThreadIdRef.current = threadId;
      setWorkflowState({ active: null, isSubmitting: false });
      loadConversation().then();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
};
