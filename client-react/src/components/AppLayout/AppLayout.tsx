import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useMediaQuery';
import Toolbar from '../Toolbar/Toolbar';
import Sidebar from '../Sidebar/Sidebar';
import { authService } from '../../services/auth';
import type { Conversation } from '../../types/common.types.ts';
import { useConversations } from "../../contexts/useConversations.ts";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Derive sidebar state from isMobile with manual override capability
  const [userOverride, setUserOverride] = useState(false);
  const [manualSidebarState, setManualSidebarState] = useState(false);

  // Automatically sync with responsive behavior unless user manually toggled
  const sidebarOpen = userOverride ? manualSidebarState : !isMobile;

  const { conversations, loading, deleteConversation } = useConversations();
  const [searchParams] = useSearchParams();
  const currentThreadId = searchParams.get('threadId');

  const handleToggleSidebar = () => {
    setUserOverride(true);
    setManualSidebarState(!sidebarOpen);
  };

  const handleSidebarItemClick = () => {
    // Auto-close sidebar on mobile when menu item is clicked
    if (isMobile) {
      setUserOverride(false); // Reset to auto-behavior
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <Toolbar
        onToggleSidebar={handleToggleSidebar}
        onCloseSidebar={() => setUserOverride(false)}
        isSidebarOpen={sidebarOpen}
        isMobile={isMobile}
      />

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
          onClose={() => setUserOverride(false)}
          onItemClick={handleSidebarItemClick}
          loading={loading}
          userName={authService.getUser()?.name}
          onLogout={handleLogout}
          onOpenConfig={() => navigate('/agent-config')}
          onOpenEmployeeData={() => navigate('/employee-data')}
        />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
