import { useState } from 'react';
import { Search, MessageSquare, Trash2, HelpCircle, FileText, LogOut, User, Settings, Users } from 'lucide-react';
import type { Conversation } from '../../types';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  onItemClick?: () => void;
  isMobile?: boolean;
  loading: boolean;
  userName?: string;
  onLogout?: () => void;
  onOpenConfig?: () => void;
  onOpenEmployeeData?: () => void;
}

export default function Sidebar({
  conversations = [],
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  onItemClick,
  isMobile = false,
  loading,
  userName,
  onLogout,
  onOpenConfig,
  onOpenEmployeeData
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = Array.isArray(conversations)
    ? conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleConversationClick = (id: string) => {
    onSelectConversation(id);
    onItemClick?.();
  };

  const handleConfigClick = () => {
    onOpenConfig?.();
    onItemClick?.();
  };

  const handleEmployeeDataClick = () => {
    onOpenEmployeeData?.();
    onItemClick?.();
  };

  return (
    <>
      {/* Backdrop for mobile overlay */}
      {isMobile && (
        <div
          className={`fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? 'fixed top-16 left-0 bottom-0 z-50' : 'relative'}
          ${isOpen ? 'w-64' : 'w-0'}
          ${isMobile && isOpen ? 'translate-x-0' : ''}
          ${isMobile && !isOpen ? '-translate-x-full' : ''}
          bg-white border-r border-gray-200
          flex flex-col
          transition-all duration-300 ease-in-out
          overflow-hidden flex-shrink-0
        `}
      >
        {/* Inner wrapper to prevent content collapse */}
        <div className="min-w-64 flex flex-col h-full">
          {/* Search */}
          <div className="p-4 border-gray-200 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">CHATS</h2>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8 px-4">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.conversationId}
                    className={`
                      group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer mb-1
                      ${currentConversationId === conv.conversationId
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-gray-100 text-gray-700'
                      }
                    `}
                    onClick={() => handleConversationClick(conv.conversationId)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate text-[0.9rem]">
                      {conv.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this conversation?')) {
                          onDeleteConversation(conv.conversationId);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            {userName && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-gray-700 truncate">{userName}</span>
              </div>
            )}
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">INFO</h2>
            {onOpenConfig && (
              <button
                onClick={handleConfigClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm group"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                Agent Config
              </button>
            )}
            {onOpenEmployeeData && (
              <button
                onClick={handleEmployeeDataClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm group"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                Mock Data
              </button>
            )}
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm group">
              <FileText className="w-4 h-4 text-sky-600" />
              Updates & FAQ
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm group">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              Support
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm mt-2"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

    </>
  );
}
