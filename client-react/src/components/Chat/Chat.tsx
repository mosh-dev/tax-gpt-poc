import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Trash2, X } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Message, Conversation, StreamEvent } from '../../types';
import { apiService } from '../../services/api';
import TaxDataModal from './TaxDataModal';

interface ChatProps {
  conversationId: string | null;
  onConversationCreated?: (conversation: Conversation) => void;
}

interface SwissTaxData {
  name?: string;
  maritalStatus?: string;
  income?: number;
  deductions?: number;
  [key: string]: any;
}

export default function Chat({ conversationId }: ChatProps) {
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

  // Configure marked
  useEffect(() => {
    marked.setOptions({
      breaks: false,
      gfm: true,
      renderer: new marked.Renderer(),
    });
  }, []);

  // Load conversation messages
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    } else {
      initializeChat();

      // Check for initial message from Welcome screen
      const initialMessage = sessionStorage.getItem('initialMessage');
      const initialFileIds = sessionStorage.getItem('initialFileIds');

      if (initialMessage) {
        sessionStorage.removeItem('initialMessage');

        // If there are file IDs, auto-send the message with files
        if (initialFileIds) {
          sessionStorage.removeItem('initialFileIds');
          // Auto-send message with file IDs
          sendMessageWithFileIds(initialMessage, initialFileIds.split(','));
        } else {
          setCurrentMessage(initialMessage);
          // Auto-send the message
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 100);
        }
      }
    }
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const initializeChat = () => {
    setMessages([
      {
        conversationId: '',
        role: 'assistant',
        content: `Hallo! I'm your Swiss tax assistant for Canton Zurich. I can help you with your tax return by loading your tax data, calculating deductions, and generating PDF documents. Just ask me naturally!

Try asking:
- Get my single tax data
- Load married tax scenario
- Calculate my deductions
- Generate a PDF of my tax return`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const loadConversation = async () => {
    if (!conversationId) return;

    try {
      const data = await apiService.getConversation(conversationId);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
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

  const parseMarkdown = (content: string): string => {
    try {
      const html = marked.parse(content) as string;
      return DOMPurify.sanitize(html);
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
          const downloadUrl = `http://localhost:3000${event.result.downloadUrl}`;
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

  const sendMessageWithFileIds = async (message: string, fileIds: string[]) => {
    // Build message with file IDs
    let messageContent = message || 'I have uploaded some documents. Please analyze them.';
    if (fileIds.length > 0) {
      messageContent += '\n\n[Uploaded Files]';
      fileIds.forEach(id => {
        messageContent += `\n[fileId: ${id}]`;
      });
    }

    const userDisplayMessage = message || `Uploaded ${fileIds.length} document(s)`;

    const userMessage: Message = {
      conversationId: conversationId || '',
      role: 'user',
      content: userDisplayMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    const assistantMessage: Message = {
      conversationId: conversationId || '',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      let firstChunk = false;

      for await (const event of apiService.streamChat(messageContent, conversationId || undefined, fileIds)) {
        switch (event.type) {
          case 'connected':
            break;

          case 'chunk':
            if (event.content) {
              assistantMessage.content += event.content;
              if (!firstChunk && event.content.trim().length > 0) {
                setIsLoading(false);
                firstChunk = true;
              }
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
            break;

          case 'tool-call':
            console.log('Tool called:', event.toolName);
            break;

          case 'tool-result':
            handleToolResult(event, assistantMessage);
            setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            break;

          case 'done':
            console.log('Stream completed');
            break;

          case 'error':
            setError(event.error || 'Stream error occurred');
            break;
        }
      }

      // If no content was received, remove empty message
      if (assistantMessage.content.trim().length === 0) {
        setMessages(prev => prev.slice(0, -1));
        setError('No response received from assistant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if ((!currentMessage.trim() && selectedFiles.length === 0) || isLoading || isUploading) {
      return;
    }

    // Upload files first
    let fileIds: string[] = [];
    if (selectedFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadedFiles = await apiService.uploadFiles(selectedFiles, conversationId || undefined);
        fileIds = uploadedFiles.map(f => f.fileId);
      } catch (err: any) {
        setError(`Upload failed: ${err.message}`);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Build message
    let messageContent = currentMessage || 'I have uploaded some documents. Please analyze them.';
    if (fileIds.length > 0) {
      messageContent += '\n\n[Uploaded Files]';
      fileIds.forEach(id => {
        messageContent += `\n[fileId: ${id}]`;
      });
    }

    const userDisplayMessage = currentMessage || `Uploaded ${selectedFiles.length} document(s)`;

    const userMessage: Message = {
      conversationId: conversationId || '',
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
      conversationId: conversationId || '',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      let firstChunk = false;

      for await (const event of apiService.streamChat(messageContent, conversationId || undefined, fileIds)) {
        switch (event.type) {
          case 'connected':
            break;

          case 'chunk':
            if (event.content) {
              assistantMessage.content += event.content;
              if (!firstChunk && event.content.trim().length > 0) {
                setIsLoading(false);
                firstChunk = true;
              }
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
            break;

          case 'tool-call':
            console.log('Tool called:', event.toolName);
            break;

          case 'tool-result':
            handleToolResult(event, assistantMessage);
            setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            break;

          case 'done':
            console.log('Stream completed');
            break;

          case 'error':
            setError(event.error || 'Stream error occurred');
            break;
        }
      }

      // If no content was received, remove empty message
      if (assistantMessage.content.trim().length === 0) {
        setMessages(prev => prev.slice(0, -1));
        setError('No response received from assistant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
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

  const clearChat = () => {
    setMessages([]);
    initializeChat();
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                <path d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Tax-GPT Assistant</h2>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </button>
        </div>
      </div>

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
              className={`max-w-2xl ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white rounded-2xl rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-none'
              } px-6 py-4`}
            >
              <div className="text-sm font-semibold mb-2">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
              />
              <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-100' : 'text-gray-500'}`}>
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center text-white">
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
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-6 py-4">
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
      <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
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

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            className="p-3 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me about your Swiss tax return or attach documents..."
            disabled={isLoading}
            rows={3}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none"
          />

          <button
            onClick={sendMessage}
            disabled={(!currentMessage.trim() && selectedFiles.length === 0) || isLoading || isUploading}
            className="px-6 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
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
