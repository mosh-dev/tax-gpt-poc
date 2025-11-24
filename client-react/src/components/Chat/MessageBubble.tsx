import { Copy, Edit2 } from 'lucide-react';
import type { Message } from '../../types/common.types.ts';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MessageBubbleProps {
  message: Message;
  onButtonClick?: (value: string) => void;
}

export default function MessageBubble({ message, onButtonClick }: MessageBubbleProps) {
  const parseMarkdown = (content: string): string => {
    try {
      const html = marked.parse(content) as string;
      return DOMPurify.sanitize(html);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return content;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div
      className={`flex gap-4 mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}
    >
      {/* Avatar - Assistant */}
      {message.role === 'assistant' && (
        <div className="w-10 h-10 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center text-primary-600">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="9" cy="10" r="1.5" fill="currentColor" />
            <circle cx="15" cy="10" r="1.5" fill="currentColor" />
            <path
              d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Message Content */}
      <div className="max-w-2xl">
        {/* Bubble */}
        <div
          className={`${
            message.role === 'user'
              ? 'bg-primary-600 rounded-2xl rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md'
          } px-6 py-4`}
        >
          <div className="text-sm font-semibold mb-2">
            {message.role === 'user' ? 'You' : 'TaxGPT'}
            <span className="ml-2 text-xs opacity-70">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div
            className={`prose prose-sm max-w-none ${
              message.role === 'user' ? 'prose-invert' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        </div>

        {/* Action Buttons - Only for assistant messages */}
        {message.role === 'assistant' && (
          <div className="flex gap-2 mt-2 ml-2">
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Button Options - From UX design */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {message.buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => onButtonClick?.(button.value)}
                className="px-6 py-2 bg-white border-2 border-primary-500 text-primary-600 rounded-full hover:bg-primary-50 transition-colors font-medium text-sm"
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Avatar - User */}
      {message.role === 'user' && (
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
            <path
              d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
