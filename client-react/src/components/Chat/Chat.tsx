import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Message, StreamEvent, TaxDocument, WorkflowStatus, StreamContext, StreamEventResult } from '../../types/common.types.ts';
import { apiService } from '../../services/api';
import { useConversations } from '../../contexts/useConversations';
import TaxDataModal from './TaxDataModal';
import WorkflowStepMessage from './WorkflowStepMessage';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import LoadingBubble from './LoadingBubble';
import { TOOL_NAMES, WORKFLOW_IDS, WORKFLOW_STATUS } from "../../constants/workflow.ts";
import { STREAM_EVENT_TYPES } from "../../constants/events.ts";
import {
  handleConnectedEvent,
  handleChunkEvent,
  handleToolCallEvent,
  handleDoneEvent,
  handleErrorEvent,
  updateMessageAfterToolResult,
} from '../../utils/chat/streamEventHandlers';
import { handleWorkflowToolResult } from '../../utils/chat/workflowStreamHandlers';
import type { LocationState, ChatProps, SendMessageOptions } from './Chat.types';

export default function Chat({threadId}: ChatProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {loadConversations} = useConversations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // Track if assistant is actively streaming
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Tax data modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingToolResult, setPendingToolResult] = useState<any>(null);

  // Workflow state - integrated into chat
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowStatus | null>(null);
  const [isWorkflowSubmitting, setIsWorkflowSubmitting] = useState(false);

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

  const updateWorkflowState = useCallback((lastMessage: Message) => {
    if (!lastMessage?.toolCalls || lastMessage.toolCalls.length === 0) {
      setActiveWorkflow(null);
      return;
    }

    // Find the last workflow tool call by iterating in reverse
    const lastWorkflowToolCall = [...lastMessage.toolCalls]
      .reverse()
      .find(toolCall =>
        (toolCall.toolName === TOOL_NAMES.START_WORKFLOW ||
         toolCall.toolName === TOOL_NAMES.RESUME_WORKFLOW) &&
        toolCall.result
      );

    if (!lastWorkflowToolCall) {
      return;
    }

    const result = lastWorkflowToolCall.result;

    // Check if workflow is suspended (not completed)
    if (result.success && !result.completed && result.runId) {
      setActiveWorkflow({
        runId: result.runId,
        threadId: threadId,
        workflowId: WORKFLOW_IDS.TAX_CALCULATION,
        status: WORKFLOW_STATUS.SUSPENDED,
        currentStep: result.nextStep || result.currentStep,
        suspendPayload: result.suspendPayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [threadId]);

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
      updateWorkflowState(lastMessage);
    } catch {
      // Conversation not found (404) - this is expected for new conversations
      // The conversation will be created when the first message is sent
      // Just start with empty messages, no need to show an error
      setMessages([]);
      setActiveWorkflow(null);
    }
  }, [threadId, updateWorkflowState]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };

  /**
   * Unified SSE streaming handler - consolidates all chat streaming logic
   * Orchestrates stream processing and delegates to specialized handlers
   */
  const streamChatMessage = async (
    content: string,
    threadIdToUse: string,
    fileIds?: string[],
    onConnected?: (threadId?: string) => void,
    agentMessage?: string
  ) => {
    const assistantMessage: Message = {
      conversationId: threadIdToUse,
      role: 'assistant',
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
        setError('No response received from assistant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
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

  const handleToolResult = (event: StreamEvent, assistantMessage: Message) => {
    switch (event.toolName) {
      case TOOL_NAMES.GET_TAX_DATA:
        setPendingToolResult(event.result);
        setIsModalOpen(true);
        break;

      case TOOL_NAMES.GENERATE_TAX_PDF:
        if (!event.result?.downloadUrl) {
          assistantMessage.content += `\n\nFailed to generate PDF: ${event.result?.error || 'Unknown error'}`;
        }
        break;

      case TOOL_NAMES.CALCULATE_DEDUCTIONS:
        if (event.result) {
          const result = event.result;
          let summary = `\n\n📊 **Deduction Calculation Results:**\n`;
          summary += `- Total Deductions: CHF ${result.totalDeductions?.toLocaleString() || 0}\n`;
          summary += `- Estimated Tax Savings: CHF ${result.estimatedTaxSavings?.toLocaleString() || 0}\n\n`;

          if (result.recommendations && result.recommendations.length > 0) {
            summary += `💡 **Recommendations:**\n`;
            result.recommendations.forEach((rec: string, idx: number) => {
              summary += `${idx + 1}. ${rec}\n`;
            });
          }
          assistantMessage.content += summary;
        }
        break;

      default:
        console.log('Tool result:', event.toolName, event.result);
        break;
    }
  };

  // Handle workflow step submission - receives pre-formatted messages from WorkflowStepMessage
  const handleWorkflowStepSubmit = async (displayMessage: string, agentMessage: string) => {
    if (!activeWorkflow) return;

    setIsWorkflowSubmitting(true);

    // Keep workflow UI visible - backend will update to next step or clear on completion/error
    // DON'T clear activeWorkflow here to prevent UI flicker

    const userMessage: Message = {
      conversationId: threadId,
      role: 'user',
      content: displayMessage,  // Show clean message to user
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    // Keep isWorkflowSubmitting true - will be cleared when workflow updates in tool-result handler

    // Send both messages: displayMessage for storage, agentMessage for LLM
    await streamChatMessage(displayMessage, threadId, undefined, undefined, agentMessage);
  };

  // Handle file uploads for workflow
  const handleWorkflowUploadFiles = async (files: File[]): Promise<TaxDocument[]> => {
    const uploadedFiles = await apiService.uploadFiles(files, threadId);
    return uploadedFiles.map(f => ({
      fileId: f.fileId,
      fileName: f.originalName,
      fileType: f.mimeType,
    }));
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
    if (files.length > 0) {
      setIsUploading(true);
      try {
        const uploadedFiles = await apiService.uploadFiles(files, threadId || undefined);
        fileIds = uploadedFiles.map(f => f.fileId);
      } catch (err: any) {
        setError(`Upload failed: ${err.message}`);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Build display message for user (clean, with filenames) - stored in DB
    let userDisplayMessage = message;
    if (files.length > 0) {
      const fileNames = files.map(f => f.name).join(', ');
      userDisplayMessage += `\n\n📎 Attached: ${fileNames}`;
    }

    // Build agent message (with fileIds) - sent to agent only
    let agentMessage = message;
    if (fileIds.length > 0) {
      agentMessage += '\n\n[Uploaded Files]';
      fileIds.forEach(id => {
        agentMessage += `\n[fileId: ${id}]`;
      });
    }

    const userMessage: Message = {
      conversationId: threadId || '',
      role: 'user',
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
    await streamChatMessage(userDisplayMessage, threadId, fileIds, onConnected, agentMessage);
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
        {activeWorkflow && activeWorkflow.status === 'suspended' && !isWorkflowSubmitting && !isStreaming && (
          <div className="mb-6">
            <div
              className="max-w-full sm:max-w-xl md:max-w-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-sm shadow-gray-300/50 dark:shadow-gray-700/50 px-4 py-3 md:px-6 md:py-4">
              <WorkflowStepMessage
                workflow={activeWorkflow}
                onSubmit={handleWorkflowStepSubmit}
                onUploadFiles={handleWorkflowUploadFiles}
                onCancel={() => {
                  setActiveWorkflow(null);
                }}
                isSubmitting={isWorkflowSubmitting}
                onRender={scrollToBottom}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="pb-20"/>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-4 mb-20">
          <div
            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm max-w-4xl mx-auto">
            {JSON.stringify(error)}
          </div>
        </div>
      )}

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
          placeholder={activeWorkflow ? "Complete workflow step first..." : "Type your message..."}
        />
      </div>
    </div>
  );
}
