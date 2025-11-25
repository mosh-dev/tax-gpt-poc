import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Message, TaxDocument, WorkflowStatus } from '../../types/common.types.ts';
import { apiService } from '../../services/api';
import { useConversations } from '../../contexts/useConversations';
import { useStreamChat } from '../../hooks/useStreamChat';
import { useThreadManagement } from '../../hooks/useThreadManagement';
import { useModalState } from '../../hooks/useModalState';
import { useWorkflowState } from '../../hooks/useWorkflowState';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import TaxDataModal from './TaxDataModal';
import TaxWorkflowStep from './TaxWorkflowStep';
import WorkflowContainer from './WorkflowContainer';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import LoadingBubble from './LoadingBubble';
import ErrorDisplay from './ErrorDisplay';
import { WORKFLOW_IDS, WORKFLOW_STATUS } from "../../constants/workflow.ts";
import { MESSAGE_ROLES } from "../../constants/events.ts";
import { CHAT_PLACEHOLDERS, ERROR_MESSAGES } from "../../constants/chatMessages";
import { uploadWorkflowFiles } from '../../utils/chat/fileUpload';
import { extractWorkflowState } from '../../utils/chat/workflowState';
import { prepareMessageWithFiles } from '../../utils/chat/messageBuilder';
import type { ChatProps, SendMessageOptions } from './Chat.types';

export default function Chat({threadId}: ChatProps) {
  const navigate = useNavigate();
  const {loadConversations} = useConversations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Tax data modal state
  const { isModalOpen, pendingToolResult, setIsModalOpen, setPendingToolResult } = useModalState();

  // Workflow state - integrated into chat
  const {
    activeWorkflow,
    isWorkflowSubmitting,
    setActiveWorkflow,
    setIsWorkflowSubmitting,
    setWorkflowState,
  } = useWorkflowState();

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

  // Auto-scroll to bottom when messages or loading state changes
  const messagesEndRef = useAutoScroll<HTMLDivElement>([messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };

  const loadConversation = useCallback(async () => {
    if (!threadId) {
      // New conversation - don't load anything
      setMessages([]);
      setWorkflowState({ active: null, isSubmitting: false });
      return;
    }

    try {
      const data = await apiService.getConversation(threadId);
      setMessages(data.messages);

      // Check last message for active workflow state from tool calls
      const lastMessage = data.messages[data.messages.length - 1];
      const activeWorkflow = extractWorkflowState(lastMessage, threadId);
      setWorkflowState({ active: activeWorkflow, isSubmitting: false });
    } catch {
      // Conversation not found (404) - this is expected for new conversations
      // The conversation will be created when the first message is sent
      // Just start with empty messages, no need to show an error
      setMessages([]);
      setWorkflowState({ active: null, isSubmitting: false });
    }
  }, [threadId, setWorkflowState]);

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

    // Prepare message with file uploads
    setIsUploading(true);
    let userDisplayMessage: string;
    let agentMessage: string;
    let fileIds: string[];

    try {
      const prepared = await prepareMessageWithFiles(message, files, threadId || undefined);
      userDisplayMessage = prepared.userDisplayMessage;
      agentMessage = prepared.agentMessage;
      fileIds = prepared.fileIds;
    } catch (err: any) {
      setError(ERROR_MESSAGES.UPLOAD_FAILED(err.message));
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

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

  // Thread management - handles loading and initial messages
  useThreadManagement({
    threadId,
    setMessages,
    setWorkflowState,
    loadConversation,
    sendInitialMessage,
  });

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
