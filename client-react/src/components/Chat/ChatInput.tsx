import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, files: File[]) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

export default function ChatInput({ onSendMessage, disabled, isUploading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if ((!message.trim() && selectedFiles.length === 0) || disabled || isUploading) {
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
    <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
      {/* Selected Files */}
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
          placeholder="Ask me about your Swiss tax return or attach documents..."
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none"
        />

        {/* Icons inside input on the right */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pb-1">
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
            disabled={(!message.trim() && selectedFiles.length === 0) || disabled || isUploading}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            title="Send"
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
  );
}
