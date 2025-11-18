import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    icon: '✨',
    title: 'Explain Tax calculation in simple terms',
  },
  {
    icon: '📊',
    title: 'Calculate my Tax with all the document required',
  },
  {
    icon: '💡',
    title: 'Advise me - How can I reduce my taxes effectively?',
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

  const handlePromptClick = (prompt: string) => {
    handleStartNewChat(prompt);
  };

  const handleSendMessage = (message: string, files: File[]) => {
    handleStartNewChat(message, files);
  };
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full text-center">
        {/* Greeting */}
        <div className="mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hey, Mate!
          </h1>
          <p className="text-2xl text-gray-700">
            Let's plan your taxes <span className="text-primary-600 font-semibold">together</span>
          </p>
        </div>

        {/* Starter Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {starterPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt.title)}
              disabled={isSending}
              className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 hover:shadow-lg transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl group-hover:bg-primary-50 transition-colors">
                  {prompt.icon}
                </div>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">
                  {prompt.title}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isSending && (
          <div className="mb-6 flex items-center justify-center gap-2 text-primary-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
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
