import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Message, TaxDocument, WorkflowStatus } from '../../types/common.types.ts';
import { apiService } from '../../services/api';
import { useConversations } from '../../contexts/useConversations';
import { useStreamChat } from '../../hooks/useStreamChat';
import TaxDataModal from './TaxDataModal';
import TaxWorkflowStep from './TaxWorkflowStep';
import WorkflowContainer from './WorkflowContainer';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import LoadingBubble from './LoadingBubble';
import ErrorDisplay from './ErrorDisplay';
import { WORKFLOW_IDS, WORKFLOW_STATUS } from "../../constants/workflow.ts";
import { MESSAGE_ROLES } from "../../constants/events.ts";
import { CHAT_PLACEHOLDERS, ERROR_MESSAGES, FILE_ATTACHMENT_FORMAT } from "../../constants/chatMessages";
import { uploadWorkflowFiles } from '../../utils/chat/fileUpload';
import { extractWorkflowState } from '../../utils/chat/workflowState';
import type { LocationState, ChatProps, SendMessageOptions, TaxDataToolResult } from './Chat.types';

export default function Chat({threadId}: ChatProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {loadConversations} = useConversations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Tax data modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingToolResult, setPendingToolResult] = useState<TaxDataToolResult | null>(null);

  // Workflow state - integrated into chat
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowStatus | null>(null);
  const [isWorkflowSubmitting, setIsWorkflowSubmitting] = useState(false);

  // Streaming chat hook
  const { streamChatMessage, isStreaming } = useStreamChat({
    setMessages,
    setIsLoading,
    setError,
    setActiveWorkflow,
    setIsWorkflowSubmitting,
    setPendingToolResult,
    setIsModalOpen,
    isWorkflowSubmitting,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef<string | null>(null); // Track which threadId we sent initial message for
  const loadedThreadIdRef = useRef<string | null>(null); // Track which threadId we've loaded

  // Handle thread changes and initial messages
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
      setActiveWorkflow(null);

      // Send the initial message (agent will detect workflow intent from message)
      sendInitialMessage(state.initialMessage, state.files || []).then();
    } else if (!state?.initialMessage && loadedThreadIdRef.current !== threadId) {
      // Normal conversation load (no initial message)
      // Use ref to prevent double execution in React StrictMode
      loadedThreadIdRef.current = threadId;
      setActiveWorkflow(null);
      loadConversation().then();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadConversation = useCallback(async () => {
    if (!threadId) {
      // New conversation - don't load anything
      setMessages([]);
      setActiveWorkflow(null);
      return;
    }

    try {
      const data = await apiService.getConversation(threadId);
      setMessages(data.messages);

      // Check last message for active workflow state from tool calls
      const lastMessage = data.messages[data.messages.length - 1];
      const workflowState = extractWorkflowState(lastMessage, threadId);
      setActiveWorkflow(workflowState);
    } catch {
      // Conversation not found (404) - this is expected for new conversations
      // The conversation will be created when the first message is sent
      // Just start with empty messages, no need to show an error
      setMessages([]);
      setActiveWorkflow(null);
    }
  }, [threadId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };

  // Handle workflow step submission - receives pre-formatted messages from TaxWorkflowStep
  const handleWorkflowStepSubmit = async (displayMessage: string, agentMessage: string) => {
    if (!activeWorkflow) return;

    setIsWorkflowSubmitting(true);

    // Keep workflow UI visible - backend will update to next step or clear on completion/error
    // DON'T clear activeWorkflow here to prevent UI flicker

    const userMessage: Message = {
      conversationId: threadId,
      role: MESSAGE_ROLES.USER,
      content: displayMessage,  // Show clean message to user
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    // Keep isWorkflowSubmitting true - will be cleared when workflow updates in tool-result handler

    // Send both messages: displayMessage for storage, agentMessage for LLM
    await streamChatMessage({
      content: displayMessage,
      threadId,
      agentMessage,
    });
  };

  // Handle file uploads for workflow
  const handleWorkflowUploadFiles = async (files: File[]): Promise<TaxDocument[]> => {
    return uploadWorkflowFiles(files, threadId);
  };

  // Render workflow step based on workflow ID
  const renderWorkflowStep = (workflow: WorkflowStatus) => {
    switch (workflow.workflowId) {
      case WORKFLOW_IDS.TAX_CALCULATION:
        return (
          <TaxWorkflowStep
            workflow={workflow}
            onSubmit={handleWorkflowStepSubmit}
            onUploadFiles={handleWorkflowUploadFiles}
            onCancel={() => setActiveWorkflow(null)}
            isSubmitting={isWorkflowSubmitting}
            onRender={scrollToBottom}
          />
        );
      default:
        return (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            Unknown workflow: {workflow.workflowId}
          </div>
        );
    }
  };

  // Unified message sending function
  const sendChatMessage = async (
    message: string,
    files: File[],
    options: SendMessageOptions = {}
  ) => {
    const { replaceMessages = false, onConnected } = options;

    // Guard conditions - prevent sending if streaming or workflow active
    if (!message.trim() || isLoading || isUploading || isStreaming || activeWorkflow) {
      return;
    }

    // Upload files first if provided
    let fileIds: string[] = [];
    const hasFiles = files.length > 0;

    if (hasFiles) {
      setIsUploading(true);
      try {
        const uploadedFiles = await apiService.uploadFiles(files, threadId || undefined);
        fileIds = uploadedFiles.map(f => f.fileId);
      } catch (err: any) {
        setError(ERROR_MESSAGES.UPLOAD_FAILED(err.message));
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Build messages with file attachments
    const userDisplayMessage = hasFiles
      ? `${message}${FILE_ATTACHMENT_FORMAT.USER_DISPLAY(files.map(f => f.name).join(', '))}`
      : message;

    const agentMessage = fileIds.length > 0
      ? `${message}${FILE_ATTACHMENT_FORMAT.AGENT_MARKERS(fileIds)}`
      : message;

    const userMessage: Message = {
      conversationId: threadId || '',
      role: MESSAGE_ROLES.USER,
      content: userDisplayMessage,
      createdAt: new Date().toISOString(),
    };

    // Replace or append messages based on options
    if (replaceMessages) {
      setMessages([userMessage]);
    } else {
      setMessages(prev => [...prev, userMessage]);
    }

    setIsLoading(true);
    setError(null);

    // Send display message for storage, agent message for processing
    await streamChatMessage({
      content: userDisplayMessage,
      threadId,
      fileIds,
      onConnected,
      agentMessage,
    });
  };

  // Send initial message from Welcome page navigation
  const sendInitialMessage = async (message: string, files: File[] = []) => {
    return sendChatMessage(message, files, {
      replaceMessages: true,
      onConnected: () => loadConversations()
    });
  };

  const sendMessage = async (message: string, files: File[]) => {
    return sendChatMessage(message, files, {
      replaceMessages: false,
      onConnected: (receivedThreadId) => {
        // Capture threadId from server (for new conversations)
        if (receivedThreadId && !threadId) {
          console.log('[Chat] Received new threadId from server:', receivedThreadId);
          navigate(`/?threadId=${receivedThreadId}`, {replace: true});
          loadConversations();
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 scrollbar-hide">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {isLoading && <LoadingBubble />}

        {/* Workflow step form - rendered inline in chat */}
        {activeWorkflow && activeWorkflow.status === WORKFLOW_STATUS.SUSPENDED && !isWorkflowSubmitting && !isStreaming && (
          <WorkflowContainer>
            {renderWorkflowStep(activeWorkflow)}
          </WorkflowContainer>
        )}

        <div ref={messagesEndRef} className="pb-20"/>
      </div>

      {/* Error Display */}
      <ErrorDisplay error={error} onClose={() => setError(null)} />

      {/* Tax Data Modal */}
      <TaxDataModal
        isOpen={isModalOpen}
        toolResult={pendingToolResult}
        onConfirm={() => setIsModalOpen(false)}
        onCancel={() => setIsModalOpen(false)}
      />

      {/* Chat Input */}
      <div className="absolute bottom-0 left-0 right-0">
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isStreaming || !!activeWorkflow}
          isUploading={isUploading}
          placeholder={activeWorkflow ? CHAT_PLACEHOLDERS.WORKFLOW_ACTIVE : CHAT_PLACEHOLDERS.DEFAULT}
        />
      </div>
    </div>
  );
}
