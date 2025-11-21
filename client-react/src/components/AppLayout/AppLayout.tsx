import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useMediaQuery';
import Toolbar from '../Toolbar/Toolbar';
import Sidebar from '../Sidebar/Sidebar';
import { useConversations } from '../../contexts/ConversationContext';
import { authService } from '../../services/auth';
import type { Conversation } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { conversations, loading, deleteConversation } = useConversations();
  const [searchParams] = useSearchParams();
  const currentThreadId = searchParams.get('threadId');

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarItemClick = () => {
    // Auto-close sidebar on mobile when menu item is clicked
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    navigate('/');
  };

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/?threadId=${conversationId}`);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      if (currentThreadId === conversationId) {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Toolbar */}
      <Toolbar onToggleSidebar={handleToggleSidebar} />

      {/* Main content area with sidebar */}
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* Sidebar */}
        <Sidebar
          conversations={conversations as Conversation[]}
          currentConversationId={currentThreadId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
          onItemClick={handleSidebarItemClick}
          loading={loading}
          userName={authService.getUser()?.name}
          onLogout={handleLogout}
          onOpenConfig={() => navigate('/agent-config')}
          onOpenEmployeeData={() => navigate('/employee-data')}
        />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
