import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, files: File[]) => void;
  disabled?: boolean;
  isUploading?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSendMessage, disabled, isUploading, placeholder = "Ask me about your Swiss tax return or attach documents..." }: ChatInputProps) {
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
    <div className="fixed md:sticky bottom-0 left-0 right-0 md:left-auto md:right-auto md:mt-auto px-4 md:px-6 py-4 z-30">
      <div className="max-w-4xl mx-auto">
        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate max-w-[150px]">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                <button onClick={() => removeFile(file)} className="text-gray-500 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input with icons inside */}
        <div className="relative">
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
            className="w-full bg-white px-4 py-3 pr-24 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none overflow-hidden"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />

          {/* Icons inside input on the right */}
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full disabled:opacity-50 transition-colors flex items-center justify-center"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              onClick={handleSubmit}
              disabled={!message.trim() || disabled || isUploading}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title={selectedFiles.length > 0 && !message.trim() ? "Please add a message to send with your files" : "Send"}
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
    </div>
  );
}
