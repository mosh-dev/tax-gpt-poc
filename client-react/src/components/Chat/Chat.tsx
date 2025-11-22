import {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
import type {Message, StreamEvent, TaxDocument, WorkflowStatus} from '../../types';
import {apiService} from '../../services/api';
import {useConversations} from '../../contexts/ConversationContext';
import TaxDataModal from './TaxDataModal';
import WorkflowStepMessage from './WorkflowStepMessage';
import ChatInput from './ChatInput';
import {STEP_TITLES, TOOL_NAMES, WORKFLOW_IDS, WORKFLOW_STATUS, WORKFLOW_STEPS} from '../../constants';

interface LocationState {
  initialMessage?: string;
  fileIds?: string[];
  fileNames?: string[]; // Original filenames for display
  startWorkflow?: boolean;
  workflowType?: string;
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

export default function Chat({ threadId }: ChatProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadConversations } = useConversations();
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
  const workflowStartedRef = useRef<string | null>(null); // Track which threadId we started workflow for

  // Configure marked with custom renderer for links
  useEffect(() => {
    marked.use({
      breaks: false,
      gfm: true,
      renderer: {
        link({ href, title, text }) {
          const titleAttr = title ? ` title="${title}"` : '';
          return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
      }
    });
  }, []);

  // Handle thread changes and initial messages
  useEffect(() => {
    const state = location.state as LocationState | null;

    // Check if this is a workflow start
    // Use ref to prevent double execution in React StrictMode
    if (state?.startWorkflow && state?.workflowType === 'tax-calculation' && workflowStartedRef.current !== threadId) {
      workflowStartedRef.current = threadId;
      loadedThreadIdRef.current = threadId;
      // Clear the location state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
      setMessages([]);
      // Start the workflow and integrate into chat
      startWorkflowInChat(threadId);
      return;
    }

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

      // Send the initial message
      sendInitialMessage(state.initialMessage, state.fileIds || [], state.fileNames || []);
    } else if (!state?.initialMessage && !state?.startWorkflow && loadedThreadIdRef.current !== threadId) {
      // Normal conversation load (no initial message)
      // Use ref to prevent double execution in React StrictMode
      loadedThreadIdRef.current = threadId;
      setActiveWorkflow(null);
      loadConversation();
    }
  }, [threadId]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadConversation = async () => {
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
    } catch (err) {
      // Conversation not found (404) - this is expected for new conversations
      // The conversation will be created when the first message is sent
      // Just start with empty messages, no need to show an error
      setMessages([]);
      setActiveWorkflow(null);
    }
  };

  const updateWorkflowState = (lastMessage : Message) => {
      if (lastMessage?.toolCalls && lastMessage.toolCalls.length > 0) {
          // Find the last workflow tool call
          for (let i = lastMessage.toolCalls.length - 1; i >= 0; i--) {
              const toolCall = lastMessage.toolCalls[i];
              if ((toolCall.toolName === TOOL_NAMES.START_WORKFLOW || toolCall.toolName === TOOL_NAMES.RESUME_WORKFLOW) && toolCall.result) {
                  const result = toolCall.result;
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
                      break;
                  }
              }
          }
      } else {
          setActiveWorkflow(null);
      }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Unified SSE streaming handler - consolidates all chat streaming logic
   */
  const streamChatMessage = async (
    content: string,
    threadIdToUse: string,
    fileIds?: string[],
    onConnected?: (threadId?: string) => void
  ) => {
    const assistantMessage: Message = {
      conversationId: threadIdToUse,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    try {
      let firstChunk = false;
      let streamCompleted = false;
      let hasError = false;

      setIsStreaming(true); // Disable input while streaming

      for await (const event of apiService.streamChat(content, threadIdToUse, fileIds)) {
        switch (event.type) {
          case 'connected':
            console.log('[Chat] Connected with threadId:', event.threadId);
            onConnected?.(event.threadId);
            break;

          case 'chunk':
            if (event.content) {
              assistantMessage.content += event.content;
              if (!firstChunk && assistantMessage.content.trim().length > 0) {
                setMessages(prev => [...prev, { ...assistantMessage }]);
                setIsLoading(false);
                firstChunk = true;
              } else if (firstChunk) {
                setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
              }
            }
            break;

          case 'tool-call':
            console.log('Tool called:', event.toolName);
            break;

          case 'tool-result':
            handleToolResult(event, assistantMessage);

            // Handle workflow state updates
            if (event.toolName === TOOL_NAMES.START_WORKFLOW || event.toolName === TOOL_NAMES.RESUME_WORKFLOW) {
              const result = event.result;
              console.log('[Workflow] Tool result received:', event.toolName, result);

              // Handle successful workflow progression
              if (result?.success && !result?.completed && result?.runId) {
                const workflowStatus = {
                  runId: result.runId,
                  threadId: threadIdToUse,
                  workflowId: WORKFLOW_IDS.TAX_CALCULATION,
                  status: WORKFLOW_STATUS.SUSPENDED,
                  currentStep: result.nextStep || result.currentStep,
                  suspendPayload: result.suspendPayload,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setActiveWorkflow(workflowStatus);
                setIsWorkflowSubmitting(false); // Clear submitting state - new step is ready
                console.log('[Workflow] Updated:', workflowStatus.currentStep);
              }
              // Handle workflow completion
              else if (result?.success && result?.completed) {
                setActiveWorkflow(null);
                setIsWorkflowSubmitting(false); // Clear submitting state
                console.log('[Workflow] Completed');
              }
              // Handle workflow errors - clear workflow state
              else if (result?.success === false) {
                setActiveWorkflow(null);
                setIsWorkflowSubmitting(false); // Clear submitting state
                console.log('[Workflow] Error:', result.error || result.message);
                // Error message will be shown by the assistant
              }
            }

            if (!firstChunk) {
              setMessages(prev => [...prev, { ...assistantMessage }]);
              setIsLoading(false);
              firstChunk = true;
            } else {
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
            break;

          case 'done':
            console.log('Stream completed');
            streamCompleted = true;
            break;

          case 'error':
            hasError = true;
            setError(event.error || 'Stream error occurred');
            break;
        }
      }

      if (!firstChunk && streamCompleted && !hasError) {
        setError('No response received from assistant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
      setIsStreaming(false); // Re-enable input after streaming completes
      // Safety: Clear workflow submitting state if it wasn't cleared by tool-result
      if (isWorkflowSubmitting) {
        setIsWorkflowSubmitting(false);
      }
    }
  };

  // Clean up message content for display (remove internal instructions)
  const cleanMessageContent = (content: string): string => {
    // Remove workflow resume instructions meant for LLM
      return content
        // Remove the IMPORTANT instruction block for resume-workflow (handles nested JSON)
        .replace(/\n\n\*\*IMPORTANT: Call resume-workflow with this EXACT data:\*\*\n- stepId: "[^"]+"\n- data: .+\n?/g, '')
        .replace(/\nDo NOT modify the stepId or data structure\. Pass them exactly as shown above\.\n?/g, '')
        // Remove [Workflow Context] section
        .replace(/\n\[Workflow Context]\n- Run ID: [^\n]+\n- Step ID: [^\n]+\n?/g, '')
        // Remove [Context: threadId=xxx] tags
        .replace(/\s*\[Context: threadId=[^\]]+]/g, '')
        .trim();
  };

  const parseMarkdown = (content: string): string => {
    try {
      // Clean up content before parsing
      const cleanedContent = cleanMessageContent(content);
      const html = marked.parse(cleanedContent) as string;
      return DOMPurify.sanitize(html, {
        ADD_ATTR: ['target', 'rel'],
      });
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return content;
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
        if (event.result?.success && event.result?.downloadUrl) {
          // downloadUrl is already a full URL from fileService
          // const downloadUrl = event.result.downloadUrl;
          // assistantMessage.content += `\n\n${event.result.message}\n\n📄 [Download PDF](${downloadUrl})`;
        } else {
          assistantMessage.content += `\n\nFailed to generate PDF: ${event.result?.error || 'Unknown error'}`;
        }
        break;

      // case TOOL_NAMES.SEARCH_KNOWLEDGE_BASE:
      //   if (event.result?.success && event.result?.source) {
      //     const source = event.result.downloadUrl;
      //     assistantMessage.content += `\n\n${event.result.message}\n\n📄 [According to](${source})`;
      //   }
      //   break;

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

  // Start workflow integrated into chat - send request through LLM
  const startWorkflowInChat = async (threadIdToUse: string) => {
    setIsLoading(true);

    const displayContent = `I want to calculate my taxes for this year. Please start the tax calculation workflow.`;
    const apiContent = `${displayContent} [Context: threadId=${threadIdToUse}]`;

    const userMessage: Message = {
      conversationId: threadIdToUse,
      role: 'user',
      content: displayContent,
      createdAt: new Date().toISOString(),
    };

    setMessages([userMessage]);

    await streamChatMessage(apiContent, threadIdToUse, undefined, () => {
      loadConversations();
    });
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

    const userContent = formatWorkflowMessage(activeWorkflow.runId, stepId, data);

    // Keep workflow UI visible - backend will update to next step or clear on completion/error
    // DON'T clear activeWorkflow here to prevent UI flicker

    const userMessage: Message = {
      conversationId: threadId,
      role: 'user',
      content: userContent,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    // Keep isWorkflowSubmitting true - will be cleared when workflow updates in tool-result handler

    await streamChatMessage(userContent, threadId);
  };

  // Format workflow step data as a message for the LLM
  const formatWorkflowMessage = (runId: string, stepId: string, data: any): string => {
    const stepTitle = getStepTitle(stepId);
    let content = `**Workflow Step: ${stepTitle}**\n\n`;
    content += `[Workflow Context]\n`;
    content += `- Run ID: ${runId}\n`;
    content += `- Step ID: ${stepId}\n\n`;

    switch (stepId) {
      case WORKFLOW_STEPS.COLLECT_PERSONAL_INFO:
        content += `**Personal Information:**\n`;
        content += `- First Name: ${data.firstName}\n`;
        content += `- Last Name: ${data.lastName}\n`;
        content += `- Marital Status: ${data.maritalStatus}\n`;
        content += `- Number of Children: ${data.numberOfChildren}\n`;
        content += `- Canton: ${data.canton}\n`;
        content += `- Tax Year: ${data.taxYear}\n`;
        content += `\n**IMPORTANT: Call resume-workflow with this EXACT data:**\n`;
        content += `- stepId: "${WORKFLOW_STEPS.COLLECT_PERSONAL_INFO}"\n`;
        content += `- data: ${JSON.stringify(data)}\n`;
        break;
      case WORKFLOW_STEPS.UPLOAD_DOCUMENTS:
        const docs = data.documents || [];
        content += `**Uploaded Documents:** ${docs.length} file(s)\n`;
        docs.forEach((d: TaxDocument) => {
          content += `- ${d.fileName} (ID: ${d.fileId})\n`;
        });
        content += `\n**IMPORTANT: Call resume-workflow with this EXACT data:**\n`;
        content += `- stepId: "${WORKFLOW_STEPS.UPLOAD_DOCUMENTS}"\n`;
        content += `- data: ${JSON.stringify(data)}\n`;
        content += `\nDo NOT modify the stepId or data structure. Pass them exactly as shown above.\n`;
        break;
      case WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA:
        content += `**Confirmed Tax Data**\n`;
        content += `I confirm the extracted tax data is correct.\n`;
        content += `\n**IMPORTANT: Call resume-workflow with this EXACT data:**\n`;
        content += `- stepId: "${WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA}"\n`;
        content += `- data: ${JSON.stringify(data)}\n`;
        break;
      case WORKFLOW_STEPS.GENERATE_SUMMARY:
        content += data.generatePdf
          ? `Please generate the PDF summary.\n`
          : `Finish without PDF generation.\n`;
        content += `\n**IMPORTANT: Call resume-workflow with this EXACT data:**\n`;
        content += `- stepId: "${WORKFLOW_STEPS.GENERATE_SUMMARY}"\n`;
        content += `- data: ${JSON.stringify(data)}\n`;
        break;
      default:
        content += JSON.stringify(data, null, 2);
    }

    return content;
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
  const sendInitialMessage = async (message: string, fileIds: string[], fileNames: string[]) => {
    // Build message content for agent (with fileIds)
    let messageContent = message;
    if (fileIds.length > 0) {
      messageContent += '\n\n[Uploaded Files]';
      fileIds.forEach(id => {
        messageContent += `\n[fileId: ${id}]`;
      });
    }

    messageContent += ` [Context: threadId=${threadId}]`;

    // Build display message for user (with filenames)
    let userDisplayMessage = message;
    if (fileNames.length > 0) {
      userDisplayMessage += `\n\n📎 Attached: ${fileNames.join(', ')}`;
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

    await streamChatMessage(messageContent, threadId, fileIds, () => {
      loadConversations();
    });
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

    // Build message for agent (with fileIds)
    let messageContent = message;
    if (fileIds.length > 0) {
      messageContent += '\n\n[Uploaded Files]';
      fileIds.forEach(id => {
        messageContent += `\n[fileId: ${id}]`;
      });
    }

    // Build display message for user (with filenames)
    let userDisplayMessage = message;
    if (files.length > 0) {
      const fileNames = files.map(f => f.name).join(', ');
      userDisplayMessage += `\n\n📎 Attached: ${fileNames}`;
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

    await streamChatMessage(messageContent, threadId, fileIds, (receivedThreadId) => {
      // Capture threadId from server (for new conversations)
      if (receivedThreadId && !threadId) {
        console.log('[Chat] Received new threadId from server:', receivedThreadId);
        navigate(`/?threadId=${receivedThreadId}`, { replace: true });
        loadConversations();
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex mb-4 md:mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            <div
              className={`relative max-w-full sm:max-w-xl md:max-w-2xl shadow-sm ${
                message.role === 'user'
                  ? 'bg-primary-600 dark:bg-primary-700 text-white rounded-2xl rounded-br-none shadow-primary-600/20 dark:shadow-primary-700/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-none shadow-gray-300/50 dark:shadow-gray-700/50'
              } px-4 py-3 md:px-6 md:py-4`}
            >
              {/* Icon and title side by side */}
              <div className="flex items-center gap-2 mb-2">
                {message.role === 'assistant' && (
                  <>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 md:w-5 md:h-5">
                        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                        <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                        <path d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</div>
                  </>
                )}
                {message.role === 'user' && (
                  <>
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 md:w-5 md:h-5">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-white">You</div>
                  </>
                )}
              </div>

              <div
                className={message.role === 'user' ? 'prose-chat-user' : 'prose-chat'}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
              />
              <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-100 dark:text-primary-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex mb-4 md:mb-6">
            <div className="max-w-full sm:max-w-xl md:max-w-2xl bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 md:px-6 md:py-4 shadow-sm shadow-gray-300/50 dark:shadow-gray-700/50">
              {/* Icon and title side by side */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 md:w-5 md:h-5">
                    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                    <path d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</div>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow step form - rendered inline in chat */}
        {activeWorkflow && activeWorkflow.status === 'suspended' && !isWorkflowSubmitting && !isStreaming && (
          <div className="mb-6">
            <div className="max-w-full sm:max-w-xl md:max-w-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-sm shadow-gray-300/50 dark:shadow-gray-700/50 px-4 py-3 md:px-6 md:py-4">
              <WorkflowStepMessage
                workflow={activeWorkflow}
                onSubmit={handleWorkflowStepSubmit}
                onUploadFiles={handleWorkflowUploadFiles}
                onCancel={() => {
                  setActiveWorkflow(null);
                  console.log('[Workflow] Skipped by user');
                }}
                isSubmitting={isWorkflowSubmitting}
                onRender={scrollToBottom}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm max-w-4xl mx-auto">
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
      <ChatInput
        onSendMessage={sendMessage}
        disabled={isStreaming || !!activeWorkflow}
        isUploading={isUploading}
        placeholder={activeWorkflow ? "Complete workflow step first..." : "Type your message..."}
      />
    </div>
  );
}
