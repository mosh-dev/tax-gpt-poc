import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Conversation } from '../types/common.types.ts';
import { apiService } from '../services/api';

interface ConversationContextType {
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

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

// Module-level flag to prevent duplicate requests (persists across StrictMode remounts)
let loadingPromise: Promise<Conversation[]> | null = null;

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Reuse existing request if one is in flight
      if (!loadingPromise) {
        loadingPromise = apiService.getConversations();
      }

      const data = await loadingPromise;
      setConversations(data);

      // Clear the promise after successful load
      loadingPromise = null;
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      setError(err.message || 'Failed to load conversations');
      setConversations([]);
      loadingPromise = null; // Clear on error too
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (threadId: string) => {
    try {
      await apiService.deleteConversation(threadId);
      setConversations(prev => prev.filter(c => c.conversationId !== threadId));
      if (currentThreadId === threadId) {
        setCurrentThreadId(null);
      }
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  };

  const addConversation = (conversation: Conversation) => {
    setConversations(prev => {
      // Check if conversation already exists
      const exists = prev.some(c => c.conversationId === conversation.conversationId);
      if (exists) {
        return prev;
      }
      return [conversation, ...prev];
    });
  };

  // Load conversations on mount - properly handles StrictMode cleanup
  useEffect(() => {
    let cancelled = false;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Reuse existing request if one is in flight
        if (!loadingPromise) {
          loadingPromise = apiService.getConversations();
        }

        const data = await loadingPromise;

        // Only update state if not cancelled
        if (!cancelled) {
          setConversations(data);
        }

        // Clear the promise after successful load
        loadingPromise = null;
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load conversations:', err);
          setError(err.message || 'Failed to load conversations');
          setConversations([]);
        }
        loadingPromise = null;
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchConversations().then();

    // Cleanup function for StrictMode
    return () => {
      cancelled = true;
    };
  }, []);

  const value: ConversationContextType = {
    conversations,
    currentThreadId,
    loading,
    error,
    loadConversations,
    refreshConversations: loadConversations,
    setCurrentThreadId,
    deleteConversation,
    addConversation,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
}
