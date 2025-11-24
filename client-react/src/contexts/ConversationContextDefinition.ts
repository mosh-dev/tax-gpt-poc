import { createContext } from 'react';
import type { Conversation } from '../types/common.types.ts';

export interface ConversationContextType {
  conversations: Conversation[];
  currentThreadId: string | null;
  loading: boolean;
  error: string | null;
  loadConversations: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  setCurrentThreadId: (threadId: string | null) => void;
  deleteConversation: (threadId: string) => Promise<void>;
  addConversation: (conversation: Conversation) => void;
}

export const ConversationContext = createContext<ConversationContextType | undefined>(undefined);