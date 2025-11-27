import { useState } from 'react';
import { Search, MessageSquare, Trash2, HelpCircle, FileText, LogOut, User, Settings, Users } from 'lucide-react';
import type { Conversation } from '../../types/common.types.ts';
import { Z_INDEX_CLASS } from '../../constants/zIndex';
import { ANIMATION_CLASS } from '../../constants/animation';

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
          className={`fixed top-16 left-0 right-0 bottom-0 bg-black/50 ${Z_INDEX_CLASS.OVERLAY} transition-opacity ${ANIMATION_CLASS.MODAL} ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? `fixed top-16 left-0 bottom-0 ${Z_INDEX_CLASS.SIDEBAR}` : 'relative'}
          w-64
          ${isOpen ? 'translate-x-0 mr-0' : '-translate-x-full -mr-64'}
          bg-white dark:bg-gray-800
          flex flex-col
          transition-all duration-300 ease-in-out
          overflow-hidden flex-shrink-0
          ${isMobile ? 'overscroll-contain' : ''}
        `}
        style={isMobile ? { touchAction: 'pan-y' } : undefined}
      >
        {/* Inner wrapper - content always at full width */}
        <div className="w-full flex flex-col h-full">
          {/* Search */}
          <div className="p-4 border-gray-200 dark:border-gray-700 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-medium shadow-sm hover:bg-white dark:hover:bg-gray-750 transition-colors"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto overscroll-contain border-b border-gray-200 dark:border-gray-700">
            <div className="p-2">
              <h2 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider px-3 mb-3">Chats</h2>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-500"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8 px-4">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.conversationId}
                    className={`
                      group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer mb-1
                      ${currentConversationId === conv.conversationId
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }
                    `}
                    onClick={() => handleConversationClick(conv.conversationId)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className={`flex-1 truncate text-sm ${currentConversationId === conv.conversationId ? 'font-semibold' : 'font-medium'}`}>
                      {conv.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this conversation?')) {
                          onDeleteConversation(conv.conversationId);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4">
            {userName && (
              <div className="flex items-center gap-3 px-3 py-2 mb-3">
                <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{userName}</span>
              </div>
            )}
            <h2 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider px-3 mb-3">Info</h2>
            {onOpenConfig && (
              <button
                onClick={handleConfigClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium group"
              >
                <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Agent Config
              </button>
            )}
            {onOpenEmployeeData && (
              <button
                onClick={handleEmployeeDataClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium group"
              >
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                Mock Data
              </button>
            )}
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium group">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-500" />
              Updates & FAQ
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium group">
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              Support
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-500 text-sm font-semibold mt-2"
              >
                <LogOut className="w-4 h-4 text-red-600 dark:text-red-500" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

    </>
  );
}
