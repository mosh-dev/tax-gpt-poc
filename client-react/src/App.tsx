import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Chat from './components/Chat/Chat';
import Welcome from './components/Welcome/Welcome';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login/Login';
import AgentConfig from './components/AgentConfig/AgentConfig';
import { useConversations } from './contexts/ConversationContext';
import { authService } from './services/auth';
import { AUTH_ERROR_EVENT } from './services/api';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { conversations, loading, deleteConversation, setCurrentThreadId, refreshConversations } = useConversations();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Keep sidebar open by default
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  const threadId = searchParams.get('threadId');
  const isConfigPage = location.pathname === '/agent-config';

  // Update context when URL changes
  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId, setCurrentThreadId]);

  // Listen for auth errors (token expired, refresh failed)
  useEffect(() => {
    const handleAuthError = () => {
      authService.logout();
      setIsAuthenticated(false);
    };

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => {
      window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    refreshConversations();
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    navigate('/');
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleNewChat = () => {
    navigate('/');
  };

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/?threadId=${conversationId}`);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      if (threadId === conversationId) {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {!isConfigPage && (
          <Sidebar
            conversations={conversations}
            currentConversationId={threadId}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            loading={loading}
            userName={authService.getUser()?.name}
            onLogout={handleLogout}
            onOpenConfig={() => navigate('/agent-config')}
          />
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header with Hamburger Menu and Logo - always present for consistent layout */}
          {!isConfigPage && (
            <div className={`flex items-center gap-4 px-6 py-4 relative z-50 ${sidebarOpen ? 'invisible' : ''}`}>
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

          <Routes>
            <Route path="/agent-config" element={<AgentConfig />} />
            <Route path="*" element={
              <div className="max-w-[1200px] w-full mx-auto flex flex-col flex-1 overflow-hidden">
                {threadId ? (
                  <Chat key={threadId} threadId={threadId} />
                ) : (
                  <Welcome
                    onStartChat={() => {}}
                    onSendMessage={() => {}}
                  />
                )}
              </div>
            } />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
