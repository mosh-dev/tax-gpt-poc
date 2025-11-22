import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BarChart3, Lightbulb } from 'lucide-react';
import ChatInput from '../Chat/ChatInput';
import { apiService } from '../../services/api';
import { useConversations } from '../../contexts/ConversationContext';
import { v4 as uuidv4 } from 'uuid';

// Props kept for backward compatibility but not used - Welcome handles its own navigation
interface WelcomeProps {
  onStartChat?: (message: string) => void;
  onSendMessage?: (message: string, files: File[]) => void;
}

const starterPrompts = [
  {
    icon: Sparkles,
    iconColor: 'text-slate-600 dark:text-slate-400',
    iconBgColor: 'bg-slate-100 dark:bg-slate-800',
    cardBgColor: 'bg-gray-50 dark:bg-gray-800',
    hoverBgColor: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    title: 'Explain Tax calculation in simple terms',
    badge: null,
  },
  {
    icon: BarChart3,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/50',
    cardBgColor: 'bg-gray-50 dark:bg-gray-800',
    hoverBgColor: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    title: 'I want to calculate my taxes for this year with all required documents, Start the Process',
    badge: 'Interactive',
  },
  {
    icon: Lightbulb,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBgColor: 'bg-teal-100 dark:bg-teal-900/50',
    cardBgColor: 'bg-gray-50 dark:bg-gray-800',
    hoverBgColor: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    title: 'Advise me - How can I reduce my taxes effectively?',
    badge: null,
  },
];

export default function Welcome({ }: WelcomeProps) {
  const navigate = useNavigate();
  const { loadConversations } = useConversations();
  const [isSending, setIsSending] = useState(false);

  const handleStartNewChat = async (message: string, files: File[] = []) => {
    setIsSending(true);

    try {
      // Upload files first if any
      let fileIds: string[] = [];
      let fileNames: string[] = [];
      if (files.length > 0) {
        fileNames = files.map(f => f.name);
        const uploadedFiles = await apiService.uploadFiles(files);
        fileIds = uploadedFiles.map(f => f.fileId);
      }

      // Generate a new threadId
      const newThreadId = uuidv4();

      // Navigate immediately to chat with initial message in state
      navigate(`/?threadId=${newThreadId}`, {
        replace: true,
        state: {
          initialMessage: message,
          fileIds,
          fileNames,
        }
      });

      // Refresh sidebar (will show the thread after first message is sent)
      loadConversations();
    } catch (error) {
      console.error('Failed to start chat:', error);
      setIsSending(false);
    }
  };

  const handlePromptClick = (prompt: typeof starterPrompts[0]) => {
    // All prompts go through normal chat - agent will ask about interactive mode
    handleStartNewChat(prompt.title);
  };

  const handleSendMessage = (message: string, files: File[]) => {
    handleStartNewChat(message, files);
  };
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full text-center">
        {/* Greeting */}
        <div className="mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Hey, Mate!
          </h1>
          <p className="text-2xl text-gray-700 dark:text-gray-300">
            Let's plan your taxes <span className="text-primary-600 dark:text-primary-400 font-semibold">together</span>
          </p>
        </div>

        {/* Starter Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {starterPrompts.map((prompt, index) => {
            const Icon = prompt.icon;
            return (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                disabled={isSending}
                className={`group relative ${prompt.cardBgColor} ${prompt.hoverBgColor} border border-transparent rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-start justify-start`}
              >
                <div className="flex flex-col gap-4 items-start w-full">
                  <div className={`w-12 h-12 ${prompt.iconBgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm self-start`}>
                    <Icon className={`w-6 h-6 ${prompt.iconColor}`} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                      {prompt.title}
                    </p>
                    {prompt.badge && (
                      <span className="text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded self-start">
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

        {/* Message Input */}
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
