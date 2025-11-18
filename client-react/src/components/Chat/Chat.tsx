import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Paperclip, X } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Message, StreamEvent } from '../../types';
import { apiService, API_BASE_URL } from '../../services/api';
import { useConversations } from '../../contexts/ConversationContext';
import TaxDataModal from './TaxDataModal';

interface LocationState {
  initialMessage?: string;
  fileIds?: string[];
  fileNames?: string[]; // Original filenames for display
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
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Tax data modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingTaxData, setPendingTaxData] = useState<SwissTaxData | null>(null);
  const [pendingScenario, setPendingScenario] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialMessageSentRef = useRef<string | null>(null); // Track which threadId we sent initial message for
  const loadedThreadIdRef = useRef<string | null>(null); // Track which threadId we've loaded

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

    // Check if this is a new conversation with initial message
    // Use ref to prevent double execution in React StrictMode
    if (state?.initialMessage && initialMessageSentRef.current !== threadId) {
      initialMessageSentRef.current = threadId;
      loadedThreadIdRef.current = threadId; // Mark as loaded to prevent loadConversation

      // Clear the location state to prevent re-sending on refresh
      window.history.replaceState({}, document.title);

      // Don't load conversation - we're about to send the first message
      setMessages([]);

      // Send the initial message
      sendInitialMessage(state.initialMessage, state.fileIds || [], state.fileNames || []);
    } else if (!state?.initialMessage && loadedThreadIdRef.current !== threadId) {
      // Normal conversation load (no initial message)
      // Use ref to prevent double execution in React StrictMode
      loadedThreadIdRef.current = threadId;
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
      return;
    }

    try {
      const data = await apiService.getConversation(threadId);
      setMessages(data.messages);
    } catch (err) {
      // Conversation not found (404) - this is expected for new conversations
      // The conversation will be created when the first message is sent
      // Just start with empty messages, no need to show an error
      setMessages([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setError(null);

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (!isImage && !isPDF) {
        setError(`Unsupported file type: ${file.name}. Only images and PDFs are supported.`);
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Maximum size is 20MB.`);
        continue;
      }

      if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
        setSelectedFiles(prev => [...prev, file]);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Clean up message content for display (remove fileId tags)
  const cleanMessageContent = (content: string): string => {
    // Remove [Uploaded Files] section and [fileId: xxx] tags
    const cleaned = content
      // .replace(/\n\n\[Uploaded Files\]\n?/g, '')
      // .replace(/\[fileId: [^\]]+\]\n?/g, '')
      // .replace(/\[Uploaded Files\]/g, '')
      .trim();

    // If nothing left after cleaning, show a default message
    // if (!cleaned) {
    //   return '📎 *Documents uploaded for analysis*';
    // }

    return cleaned;
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
      case 'getTaxDataTool':
        if (event.result?.success && event.result?.data) {
          setPendingTaxData(event.result.data);
          setPendingScenario(event.result.scenario);
          setIsModalOpen(true);
        }
        break;

      case 'generate-tax-pdf':
        if (event.result?.success && event.result?.downloadUrl) {
          const downloadUrl = `${API_BASE_URL}${event.result.downloadUrl}`;
          assistantMessage.content += `\n\n${event.result.message}\n\n📄 [Download PDF](${downloadUrl})`;
        } else {
          assistantMessage.content += `\n\nFailed to generate PDF: ${event.result?.error || 'Unknown error'}`;
        }
        break;

      case 'calculate-deductions':
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

    const assistantMessage: Message = {
      conversationId: threadId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    try {
      let firstChunk = false;
      let streamCompleted = false;
      let hasError = false;

      for await (const event of apiService.streamChat(messageContent, threadId, fileIds)) {
        switch (event.type) {
          case 'connected':
            console.log('[Chat] Connected with threadId:', event.threadId);
            // Refresh sidebar to show new conversation
            loadConversations();
            break;

          case 'chunk':
            if (event.content) {
              assistantMessage.content += event.content;
              // Only show message bubble when we have actual non-empty content
              if (!firstChunk && assistantMessage.content.trim().length > 0) {
                // Add assistant message only when first real content arrives
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

      // Only show "no response" error if stream completed normally but with no content
      if (!firstChunk && streamCompleted && !hasError) {
        setError('No response received from assistant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    // Always require a message (files alone are not enough)
    if (!currentMessage.trim() || isLoading || isUploading) {
      return;
    }

    // Upload files first
    let fileIds: string[] = [];
    if (selectedFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadedFiles = await apiService.uploadFiles(selectedFiles, threadId || undefined);
        fileIds = uploadedFiles.map(f => f.fileId);
      } catch (err: any) {
        setError(`Upload failed: ${err.message}`);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Build message for agent (with fileIds)
    let messageContent = currentMessage;
    if (fileIds.length > 0) {
      messageContent += '\n\n[Uploaded Files]';
      fileIds.forEach(id => {
        messageContent += `\n[fileId: ${id}]`;
      });
    }

    // Build display message for user (with filenames)
    let userDisplayMessage = currentMessage;
    if (selectedFiles.length > 0) {
      const fileNames = selectedFiles.map(f => f.name).join(', ');
      userDisplayMessage += `\n\n📎 Attached: ${fileNames}`;
    }

    const userMessage: Message = {
      conversationId: threadId || '',
      role: 'user',
      content: userDisplayMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setSelectedFiles([]);
    setIsLoading(true);
    setError(null);

    const assistantMessage: Message = {
      conversationId: threadId || '',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    try {
      let firstChunk = false;
      let receivedThreadId: string | null = null;
      let streamCompleted = false;
      let hasError = false;

      for await (const event of apiService.streamChat(messageContent, threadId, fileIds)) {
        switch (event.type) {
          case 'connected':
            // Capture threadId from server (for new conversations)
            if (event.threadId && !threadId) {
              receivedThreadId = event.threadId;
              console.log('[Chat] Received new threadId from server:', receivedThreadId);
              // Navigate to URL with threadId
              navigate(`/?threadId=${receivedThreadId}`, { replace: true });
              // Refresh sidebar to show new conversation
              loadConversations();
            }
            break;

          case 'chunk':
            if (event.content) {
              assistantMessage.content += event.content;
              // Only show message bubble when we have actual non-empty content
              if (!firstChunk && assistantMessage.content.trim().length > 0) {
                // Add assistant message only when first real content arrives
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

      // Only show "no response" error if stream completed normally but with no content
      if (!firstChunk && streamCompleted && !hasError) {
        setError('No response received from assistant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-4 mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex-shrink-0 flex items-center justify-center text-primary-600">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                  <path d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            )}

            <div
              className={`max-w-2xl shadow-sm ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white rounded-2xl rounded-br-none shadow-primary-600/20'
                  : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-none shadow-gray-300/50'
              } px-6 py-4`}
            >
              <div className={`text-sm font-semibold mb-2 ${message.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div
                className={message.role === 'user' ? 'prose-chat-user' : 'prose-chat'}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
              />
              <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-100' : 'text-gray-500'}`}>
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-10 h-10  rounded-lg flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex-shrink-0 flex items-center justify-center text-primary-600">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                <path d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-6 py-4 shadow-sm shadow-gray-300/50">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-gray-200 px-6 py-4 text-center">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                <button onClick={() => removeFile(file)} className="text-gray-500 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative w-1/2 mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            multiple
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type message"
            disabled={isLoading}
            rows={1}
            className="w-full bg-white px-4 py-3 pr-32 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none"
          />

          {/* Icons inside input on the right */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pb-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full disabled:opacity-50 transition-colors flex items-center justify-center"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading || isUploading}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title={selectedFiles.length > 0 && !currentMessage.trim() ? "Please add a message to send with your files" : "Send"}
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tax Data Modal */}
      <TaxDataModal
        isOpen={isModalOpen}
        taxData={pendingTaxData}
        scenario={pendingScenario}
        onConfirm={() => setIsModalOpen(false)}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}
