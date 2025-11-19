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
  onToggle: () => void;
  loading: boolean;
  userName?: string;
  onLogout?: () => void;
  onOpenConfig?: () => void;
  onOpenEmployeeData?: () => void;
}

export default function Sidebar({
  conversations = [],
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
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

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          ${isOpen ? 'w-64' : 'w-0'}
          h-full bg-white border-r border-gray-200
          flex flex-col
          transition-all duration-300 ease-in-out
          overflow-hidden flex-shrink-0
        `}
      >
        {/* Inner wrapper to prevent content collapse */}
        <div className="min-w-64 flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onNewChat}
              >
                <h1 className="text-xl font-bold text-gray-900">TaxGPT</h1>
              </div>
              {isOpen && (
                <button
                  onClick={onToggle}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Close sidebar"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
                    <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-gray-200">
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
                    onClick={() => onSelectConversation(conv.conversationId)}
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
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate">{userName}</span>
              </div>
            )}
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">INFO</h2>
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm"
              >
                <Settings className="w-4 h-4" />
                Agent Config
              </button>
            )}
            {onOpenEmployeeData && (
              <button
                onClick={onOpenEmployeeData}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm"
              >
                <Users className="w-4 h-4" />
                Mock Data
              </button>
            )}
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm">
              <FileText className="w-4 h-4" />
              Updates & FAQ
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 text-sm">
              <HelpCircle className="w-4 h-4" />
              Support
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm mt-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

    </>
  );
}
