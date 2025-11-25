import type { Message } from '../../types/common.types.ts';
import { parseMarkdown } from '../../utils/markdown';

interface MessageBubbleProps {
  message: Message;
  onButtonClick?: (value: string) => void;
}

export default function MessageBubble({ message, onButtonClick }: MessageBubbleProps) {
  const getMarkdownContent = (message: Message): string => {
    // Use displayContent if available, fallback to content
    const contentToDisplay = message.displayContent || message.content;
    return parseMarkdown(contentToDisplay);
  };

  return (
    <div className={`flex mb-4 md:mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}>
      <div
        className={`relative max-w-full sm:max-w-xl md:max-w-3xl shadow-sm overflow-y-auto ${
          message.role === 'user'
            ? 'bg-primary-600 dark:bg-primary-700 text-white rounded-2xl rounded-br-none shadow-primary-600/20 dark:shadow-primary-700/20'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-none shadow-gray-300/50 dark:shadow-gray-700/50'
        } px-4 py-3 md:px-6 md:py-4`}
      >
        {/* Icon and title side by side */}
        <div className="flex items-center gap-2 mb-2">
          {message.role === 'assistant' && (
            <>
              <div
                className="w-6 h-6 md:w-8 md:h-8 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 md:w-5 md:h-5">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                  <path d="M9 15c.5.5 1.5 1 3 1s2.5-.5 3-1" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</div>
            </>
          )}
          {message.role === 'user' && (
            <>
              <div
                className="w-6 h-6 md:w-8 md:h-8 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 md:w-5 md:h-5">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-sm font-semibold text-white">You</div>
            </>
          )}
        </div>

        <div
          className={`${message.role === 'user' ? 'prose-chat-user' : 'prose-chat'} leading-snug`}
          dangerouslySetInnerHTML={{__html: getMarkdownContent(message)}}
        />
        <div
          className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-100 dark:text-primary-200' : 'text-gray-500 dark:text-gray-400'}`}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>

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
    </div>
  );
}
