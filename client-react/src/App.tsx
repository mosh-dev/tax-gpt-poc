import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Chat from './components/Chat/Chat';
import Welcome from './components/Welcome/Welcome';
import ErrorBoundary from './components/ErrorBoundary';
import type { Conversation } from './types';
import { apiService } from './services/api';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await apiService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.conversationId !== conversationId));
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setConversations(prev => [conversation, ...prev]);
    setCurrentConversationId(conversation.conversationId);
  };

  const handleStartChat = (message: string) => {
    // Create a new conversation with the initial message
    // The Chat component will handle the actual creation
    setCurrentConversationId('new');
    // Store the initial message temporarily
    sessionStorage.setItem('initialMessage', message);
  };

  const handleSendFromWelcome = async (message: string, files: File[]) => {
    // Store the initial message
    sessionStorage.setItem('initialMessage', message);

    // Upload files if any and store their IDs
    if (files.length > 0) {
      try {
        const uploadedFiles = await apiService.uploadFiles(files);
        const fileIds = uploadedFiles.map(f => f.fileId).join(',');
        sessionStorage.setItem('initialFileIds', fileIds);
      } catch (error) {
        console.error('Failed to upload files:', error);
      }
    }

    // Transition to chat
    setCurrentConversationId('new');
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          loading={loading}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {currentConversationId && currentConversationId !== 'new' ? (
            <Chat
              conversationId={currentConversationId}
              onConversationCreated={handleConversationCreated}
            />
          ) : currentConversationId === 'new' ? (
            <Chat
              conversationId={null}
              onConversationCreated={handleConversationCreated}
            />
          ) : (
            <Welcome
              onStartChat={handleStartChat}
              onSendMessage={handleSendFromWelcome}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
