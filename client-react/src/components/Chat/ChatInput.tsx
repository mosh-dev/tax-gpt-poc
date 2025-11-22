import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, files: File[]) => void;
  disabled?: boolean;
  isUploading?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSendMessage, disabled, isUploading, placeholder = "Ask me about your Swiss tax retu..." }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [message]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (!isImage && !isPDF) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        alert(`File too large: ${file.name}`);
        continue;
      }

      if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
        setSelectedFiles(prev => [...prev, file]);
      }
    }

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

  const handleSubmit = () => {
    // Always require a message (files alone are not enough)
    if (!message.trim() || disabled || isUploading) {
      return;
    }

    onSendMessage(message, selectedFiles);
    setMessage('');
    setSelectedFiles([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 max-w-4xl mx-auto bg-opacity-50 rounded-2xl p-8" style={{background: '#101828eb'}}>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg">
              <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{file.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">({formatFileSize(file.size)})</span>
              <button onClick={() => removeFile(file)} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input with attachment button inside textarea - Claude Chat style */}
      <div className="px-4 py-4 z-30 max-w-4xl mx-auto relative">
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="relative w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 pl-14 pr-14 py-3 border border-gray-300 dark:border-gray-600 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 disabled:opacity-50 resize-none overflow-hidden leading-6 text-sm shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)]"
            style={{ minHeight: '50px', maxHeight: '204px' }}
          />

          {/* Buttons inside textarea */}
          <div className="absolute left-6 bottom-7 inline-block" style={{marginBottom: '1px'}}>
            {/* Attachment Button - Rounded square with subtle background */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className=" p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Send Button inside textarea on the right */}
          <div className="absolute right-6 bottom-7 inline-block">
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || disabled || isUploading}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title={selectedFiles.length > 0 && !message.trim() ? "Please add a message to send with your files" : "Send"}
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 dark:border-gray-300"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
    </>
  );
}
