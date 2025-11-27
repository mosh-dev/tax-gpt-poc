import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BarChart3, Lightbulb } from 'lucide-react';
import ChatInput from '../Chat/ChatInput';
import { useConversations } from '../../contexts/useConversations';
import { v4 as uuidv4 } from 'uuid';

const starterPrompts = [
  {
    icon: Sparkles,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBgColor: 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50',
    cardBgColor: 'bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-purple-900/40',
    borderColor: 'border-purple-300 dark:border-purple-700/50',
    hoverShadow: 'hover:shadow-purple-200/40 dark:hover:shadow-purple-500/20',
    title: 'Explain Tax calculation in simple terms',
    badge: null,
  },
  {
    icon: BarChart3,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBgColor: 'bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50',
    cardBgColor: 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-900/40',
    borderColor: 'border-indigo-300 dark:border-indigo-700/50',
    hoverShadow: 'hover:shadow-indigo-200/40 dark:hover:shadow-indigo-500/20',
    title: 'I want to calculate my taxes for this year with all required documents, Start the Process',
    badge: 'Interactive',
  },
  {
    icon: Lightbulb,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBgColor: 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50',
    cardBgColor: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-800 dark:via-gray-800 dark:to-emerald-900/40',
    borderColor: 'border-emerald-300 dark:border-emerald-700/50',
    hoverShadow: 'hover:shadow-emerald-200/40 dark:hover:shadow-emerald-500/20',
    title: 'Advise me - How can I reduce my taxes effectively?',
    badge: null,
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { loadConversations } = useConversations();
  const [isSending, setIsSending] = useState(false);

  const handleStartNewChat = async (message: string, files: File[] = []) => {
    setIsSending(true);

    try {
      // Generate a new threadId
      const newThreadId = uuidv4();

      // Navigate with files (not uploaded yet) - let Chat handle upload
      navigate(`/?threadId=${newThreadId}`, {
        replace: true,
        state: {
          initialMessage: message,
          files: files,  // Pass File objects, Chat will upload on send
        }
      });

      // Refresh sidebar (will show the thread after first message is sent)
      loadConversations().then();
    } catch (error) {
      console.error('Failed to start chat:', error);
      setIsSending(false);
    }
  };

  const handlePromptClick = (prompt: typeof starterPrompts[0]) => {
    // All prompts go through normal chat - agent will ask about interactive mode
    handleStartNewChat(prompt.title).then();
  };

  const handleSendMessage = (message: string, files: File[]) => {
    handleStartNewChat(message, files).then();
  };
  return (
    <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-center">
      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8 pb-32 md:pb-8 overflow-y-auto">
        <div className="max-w-4xl w-full text-center">
          {/* Greeting */}
          <div className="mb-4 sm:mb-6">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">👋</div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Hey, Mate!
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 dark:text-gray-300">
              Let's plan your taxes <span className="text-primary-600 dark:text-primary-400 font-medium">together</span>
            </p>
          </div>

          {/* Starter Prompts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {starterPrompts.map((prompt, index) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={index}
                  onClick={() => handlePromptClick(prompt)}
                  disabled={isSending}
                  className={`group relative ${prompt.cardBgColor} border ${prompt.borderColor} rounded-xl p-4 sm:p-6 shadow-md ${prompt.hoverShadow} hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-start justify-start backdrop-blur-sm`}
                >
                  <div className="flex flex-col gap-3 sm:gap-4 items-start w-full">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${prompt.iconBgColor} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm self-start`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${prompt.iconColor}`} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                        {prompt.title}
                      </p>
                      {prompt.badge && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full self-start font-medium shadow-sm">
                          {prompt.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Loading State */}
          {isSending && (
            <div className="mb-6 flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 dark:border-primary-400"></div>
              <span className="text-sm">Starting conversation...</span>
            </div>
          )}

          {/* Message Input - Inline on desktop */}
          <div className="hidden md:block">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isSending}
            />
          </div>
        </div>
      </div>

      {/* Sticky Input at Bottom - Mobile only */}
      <div className="md:hidden sticky bottom-0 left-0 right-0 dark:bg-gray-900 sm:px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isSending}
          />
        </div>
      </div>
    </div>
  );
}
