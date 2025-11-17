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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load conversation ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation');
    if (conversationId) {
      setCurrentConversationId(conversationId);
    }
    loadConversations();
  }, []);

  // Update URL when conversation changes
  useEffect(() => {
    if (currentConversationId && currentConversationId !== 'new') {
      const params = new URLSearchParams(window.location.search);
      params.set('conversation', currentConversationId);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    } else if (!currentConversationId) {
      // Clear query param when going back to welcome
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentConversationId]);

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
          {/* Header with Hamburger Menu and Logo */}
          {!sidebarOpen && (
            <div className="flex items-center gap-4 px-6 py-4 relative z-50">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300 bg-white shadow-sm"
                title="Open sidebar"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor">
                  <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">TaxGPT</h1>
            </div>
          )}

          <div className="max-w-[1200px] w-full mx-auto flex flex-col h-full">
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
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
