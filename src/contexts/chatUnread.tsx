'use client';

import * as React from 'react';
import { authHeaders } from '@/lib/client-auth';

interface ChatUnreadCtx {
  total: number;
  byConversation: Record<string, number>;
  increment: (convId: string) => void;
  clear: (convId: string) => void;
}

type State = { total: number; byConversation: Record<string, number> };
type Action =
  | { type: 'SET'; total: number; byConversation: Record<string, number> }
  | { type: 'INCREMENT'; convId: string }
  | { type: 'CLEAR'; convId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET':
      return { total: action.total, byConversation: action.byConversation };
    case 'INCREMENT': {
      const prev = state.byConversation[action.convId] ?? 0;
      return {
        total: state.total + 1,
        byConversation: { ...state.byConversation, [action.convId]: prev + 1 },
      };
    }
    case 'CLEAR': {
      const count = state.byConversation[action.convId] ?? 0;
      if (count === 0) return state;
      return {
        total: Math.max(0, state.total - count),
        byConversation: { ...state.byConversation, [action.convId]: 0 },
      };
    }
    default:
      return state;
  }
}

const ChatUnreadContext = React.createContext<ChatUnreadCtx>({
  total: 0,
  byConversation: {},
  increment: () => {},
  clear: () => {},
});

export function ChatUnreadProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { total: 0, byConversation: {} });

  const fetchUnread = React.useCallback(async () => {
    const headers = authHeaders();
    if (!headers['x-user-id']) return;
    try {
      const r = await fetch('/api/v1/chat/unread', { headers });
      const j = await r.json() as { success: boolean; data?: { total: number; conversations: { conversationId: string; unreadCount: number }[] } };
      if (j.success && j.data) {
        const byConversation: Record<string, number> = {};
        for (const conv of j.data.conversations) {
          byConversation[conv.conversationId] = conv.unreadCount;
        }
        dispatch({ type: 'SET', total: j.data.total, byConversation });
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  const increment = React.useCallback((convId: string) => {
    dispatch({ type: 'INCREMENT', convId });
  }, []);

  const clear = React.useCallback((convId: string) => {
    dispatch({ type: 'CLEAR', convId });
  }, []);

  return (
    <ChatUnreadContext.Provider value={{ total: state.total, byConversation: state.byConversation, increment, clear }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  return React.useContext(ChatUnreadContext);
}
