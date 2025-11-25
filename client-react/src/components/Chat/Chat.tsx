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
import { STEP_TITLES, TOOL_NAMES, WORKFLOW_IDS, WORKFLOW_STATUS, WORKFLOW_STEPS } from "../../constants/workflow.ts";
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

interface LocationState {
  initialMessage?: string;
  files?: File[]; // Raw File objects from Welcome (not uploaded yet)
}

interface ChatProps {
  threadId: string;
}

interface SwissTaxData {
  name?: string;
  maritalStatus?: string;
  income?: number;
  deductions?: number;

  [key: string]: any;
}

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
  const [pendingTaxData, setPendingTaxData] = useState<SwissTaxData | null>(null);
  const [pendingScenario, setPendingScenario] = useState('');

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
        if (event.result?.success && event.result?.data) {
          setPendingTaxData(event.result.data);
          setPendingScenario(event.result.scenario);
          setIsModalOpen(true);
        }
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

  // Handle workflow step submission - send through chat so LLM can process
  const handleWorkflowStepSubmit = async (stepId: string, data: any) => {
    if (!activeWorkflow) return;

    console.log('[Workflow] Submitting step:', stepId);
    console.log('[Workflow] Active workflow state:', {
      currentStep: activeWorkflow.currentStep,
      runId: activeWorkflow.runId,
      status: activeWorkflow.status
    });

    // Validate that the step being submitted matches the current workflow step
    if (stepId !== activeWorkflow.currentStep) {
      console.error('[Workflow] Step mismatch detected!', {
        submitting: stepId,
        expected: activeWorkflow.currentStep
      });
      // Force sync by clearing workflow - user will need to restart
      setActiveWorkflow(null);
      setError('Workflow state mismatch detected. Please start a new workflow.');
      return;
    }

    setIsWorkflowSubmitting(true);

    const { displayMessage, agentMessage } = formatWorkflowMessage(
      activeWorkflow.runId,
      stepId,
      data
    );

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

  // Format workflow step data as TWO separate messages: one for display, one for the agent
  const formatWorkflowMessage = (
    runId: string,
    stepId: string,
    data: any
  ): { displayMessage: string; agentMessage: string } => {
    const stepTitle = getStepTitle(stepId);

    // Build DISPLAY message (clean, user-friendly)
    let displayMessage = '';

    // Build AGENT message (with markers and instructions)
    let agentMessage = `**Workflow Step: ${stepTitle}**\n\n`;
    agentMessage += `[Workflow Context]\n`;
    agentMessage += `- Run ID: ${runId}\n`;
    agentMessage += `- Step ID: ${stepId}\n\n`;

    switch (stepId) {
      case WORKFLOW_STEPS.COLLECT_PERSONAL_INFO:
        // Display: Clean summary
        displayMessage = `**Personal Information Submitted**\n`;
        displayMessage += `- Name: ${data.firstName} ${data.lastName}\n`;
        displayMessage += `- Status: ${data.maritalStatus}\n`;
        displayMessage += `- Children: ${data.numberOfChildren}\n`;
        displayMessage += `- Location: ${data.canton}\n`;
        displayMessage += `- Tax Year: ${data.taxYear}\n`;

        // Agent: With markers and instructions
        agentMessage += `**Personal Information:**\n`;
        agentMessage += `- First Name: ${data.firstName}\n`;
        agentMessage += `- Last Name: ${data.lastName}\n`;
        agentMessage += `- Marital Status: ${data.maritalStatus}\n`;
        agentMessage += `- Number of Children: ${data.numberOfChildren}\n`;
        agentMessage += `- Canton: ${data.canton}\n`;
        agentMessage += `- Tax Year: ${data.taxYear}\n`;
        agentMessage += `\n**IMPORTANT: Call resume-workflow with this EXACT data:**\n`;
        agentMessage += `- stepId: "${WORKFLOW_STEPS.COLLECT_PERSONAL_INFO}"\n`;
        agentMessage += `- data: ${JSON.stringify(data)}\n`;
        break;

      case WORKFLOW_STEPS.UPLOAD_DOCUMENTS: {
        const docs = data.documents || [];

        // Display: Simple file list
        displayMessage = `**Documents Uploaded**\n`;
        displayMessage += `${docs.length} file(s) uploaded:\n`;
        docs.forEach((d: TaxDocument) => {
          displayMessage += `- ${d.fileName}\n`;
        });

        // Agent: With processing instructions
        agentMessage += `**Uploaded Documents:** ${docs.length} file(s)\n`;
        docs.forEach((d: TaxDocument) => {
          agentMessage += `- ${d.fileName} (ID: ${d.fileId})\n`;
        });
        agentMessage += `\n**CRITICAL - Before resuming workflow:**\n`;
        agentMessage += `1. Call process-documents tool with fileIds: [${docs.map(d => `"${d.fileId}"`).join(', ')}]\n`;
        agentMessage += `2. Wait for OCR to complete successfully\n`;
        agentMessage += `3. Then call resume-workflow with the EXACT data below:\n\n`;
        agentMessage += `**Call resume-workflow with:**\n`;
        agentMessage += `- stepId: "${WORKFLOW_STEPS.UPLOAD_DOCUMENTS}"\n`;
        agentMessage += `- data: ${JSON.stringify(data)}\n`;
        agentMessage += `\nDo NOT modify the stepId or data structure. Pass them exactly as shown above.\n`;
        break;
      }

      case WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA:
        // Display: Confirmation only
        displayMessage = `**Tax Data Confirmed**\n`;
        displayMessage += `I've reviewed and confirmed the extracted tax data is correct.\n`;

        // Agent: With resume instructions
        agentMessage += `**Confirmed Tax Data**\n`;
        agentMessage += `I confirm the extracted tax data is correct.\n`;
        agentMessage += `\n**IMPORTANT: Call resume-workflow with this EXACT data:**\n`;
        agentMessage += `- stepId: "${WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA}"\n`;
        agentMessage += `- data: ${JSON.stringify(data)}\n`;
        break;

      case WORKFLOW_STEPS.GENERATE_SUMMARY:
        // Display: User choice
        displayMessage = data.generatePdf
          ? `**Requested PDF generation**`
          : `**Completed without PDF**`;

        // Agent: With resume instructions
        agentMessage += data.generatePdf
          ? `Please generate the PDF summary.\n`
          : `Finish without PDF generation.\n`;
        agentMessage += `\n**IMPORTANT: Call resume-workflow with this EXACT data:**\n`;
        agentMessage += `- stepId: "${WORKFLOW_STEPS.GENERATE_SUMMARY}"\n`;
        agentMessage += `- data: ${JSON.stringify(data)}\n`;
        break;

      default:
        displayMessage = JSON.stringify(data, null, 2);
        agentMessage += JSON.stringify(data, null, 2);
    }

    return { displayMessage, agentMessage };
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

  // Helper to get step title
  const getStepTitle = (stepId: string): string => {
    return STEP_TITLES[stepId] || stepId;
  };

  // Send initial message from Welcome page navigation
  const sendInitialMessage = async (message: string, files: File[] = []) => {
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
      conversationId: threadId,
      role: 'user',
      content: userDisplayMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages([userMessage]);
    setIsLoading(true);
    setError(null);

    // Send display message for storage, agent message for processing
    await streamChatMessage(userDisplayMessage, threadId, fileIds, () => {
      loadConversations();
    }, agentMessage);
  };

  const sendMessage = async (message: string, files: File[]) => {
    // Prevent sending if streaming or workflow active
    if (!message.trim() || isLoading || isUploading || isStreaming || activeWorkflow) {
      return;
    }

    // Upload files first
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

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    await streamChatMessage(userDisplayMessage, threadId, fileIds, (receivedThreadId) => {
      // Capture threadId from server (for new conversations)
      if (receivedThreadId && !threadId) {
        console.log('[Chat] Received new threadId from server:', receivedThreadId);
        navigate(`/?threadId=${receivedThreadId}`, {replace: true});
        loadConversations();
      }
    }, agentMessage);
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
        taxData={pendingTaxData}
        scenario={pendingScenario}
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
