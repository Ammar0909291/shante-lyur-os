'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageCircle, Send, Search, Plus, X, Check,
  Users, Bell, BellOff, ChevronLeft, Loader2,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConvMember {
  id: string; name: string; position: string; isOnline: boolean; color: string | null;
}
interface ConversationItem {
  id: string; type: 'DIRECT' | 'GROUP'; name: string; memberCount: number;
  lastMessageAt: string | null; lastMessagePreview: string | null;
  unreadCount: number; muted: boolean; members: ConvMember[];
}
interface MessageRow {
  id: string; conversationId: string; senderId: string; senderName: string;
  type: 'TEXT' | 'SYSTEM'; content: string; createdAt: string; isOwn: boolean;
}
interface StaffUser {
  id: string; firstName: string; lastName: string; role: string;
  specialization: string | null; color: string | null; online: boolean;
}
interface TypingInfo { userId: string; userName: string; expiresAt: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeFmt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function dateSeparatorLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Сегодня';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Супер-администратор', ADMIN: 'Администратор', MANAGER: 'Менеджер',
  RECEPTIONIST: 'Ресепшн', COSMETOLOGIST: 'Косметолог', MASSAGIST: 'Массажист',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations]   = React.useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId]     = React.useState<string | null>(null);
  const [messages, setMessages]             = React.useState<MessageRow[]>([]);
  const [nextCursor, setNextCursor]         = React.useState<string | null>(null);
  const [draft, setDraft]                   = React.useState('');
  const [sending, setSending]               = React.useState(false);
  const [loadingMsgs, setLoadingMsgs]       = React.useState(false);
  const [loadingMore, setLoadingMore]       = React.useState(false);
  const [convSearch, setConvSearch]         = React.useState('');
  const [showNewChat, setShowNewChat]       = React.useState(false);
  const [showGroupModal, setShowGroupModal] = React.useState(false);
  const [staffList, setStaffList]           = React.useState<StaffUser[]>([]);
  const [staffSearch, setStaffSearch]       = React.useState('');
  const [groupName, setGroupName]           = React.useState('');
  const [groupMembers, setGroupMembers]     = React.useState<string[]>([]);
  const [creatingGroup, setCreatingGroup]   = React.useState(false);
  const [typingMap, setTypingMap]           = React.useState<Record<string, TypingInfo[]>>({});
  const [myMuted, setMyMuted]               = React.useState(false);

  const bottomRef   = React.useRef<HTMLDivElement>(null);
  const inputRef    = React.useRef<HTMLTextAreaElement>(null);
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTyping  = React.useRef<number>(0);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;
  const typingUsers = activeConvId ? (typingMap[activeConvId] ?? []).filter((t) => t.expiresAt > Date.now()) : [];

  // ── Load conversations ────────────────────────────────────────────────────

  const loadConversations = React.useCallback(async () => {
    try {
      const r = await fetch('/api/v1/chat/conversations', { credentials: 'include' });
      const j = await r.json() as { success: boolean; data?: { items: ConversationItem[] } };
      if (j.success && j.data) setConversations(j.data.items);
    } catch {}
  }, []);

  React.useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, 30_000);
    return () => clearInterval(id);
  }, [loadConversations]);

  // ── Load messages ─────────────────────────────────────────────────────────

  const loadMessages = React.useCallback(async (convId: string, cursor?: string) => {
    if (!cursor) setLoadingMsgs(true);
    else setLoadingMore(true);
    try {
      const url = `/api/v1/chat/conversations/${convId}/messages${cursor ? `?cursor=${cursor}` : ''}`;
      const r = await fetch(url, { credentials: 'include' });
      const j = await r.json() as { success: boolean; data?: { items: MessageRow[]; nextCursor: string | null } };
      if (j.success && j.data) {
        if (cursor) {
          setMessages((prev) => [...j.data!.items, ...prev]);
        } else {
          setMessages(j.data.items);
        }
        setNextCursor(j.data.nextCursor);
      }
    } finally {
      setLoadingMsgs(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Open conversation ─────────────────────────────────────────────────────

  const openConversation = React.useCallback(async (convId: string) => {
    setActiveConvId(convId);
    setMessages([]);
    setNextCursor(null);
    setMyMuted(conversations.find((c) => c.id === convId)?.muted ?? false);
    await loadMessages(convId);
    // Mark as read
    fetch(`/api/v1/chat/conversations/${convId}/read`, {
      method: 'POST', credentials: 'include',
    }).then(() => {
      setConversations((prev) => prev.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c,
      ));
    }).catch(() => {});
    // Update presence
    fetch('/api/v1/chat/presence', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activePage: `/chat/${convId}` }),
    }).catch(() => {});
  }, [conversations, loadMessages]);

  // Restore from URL param
  React.useEffect(() => {
    const convId = searchParams?.get('conv');
    if (convId && !activeConvId) openConversation(convId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (!loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMore]);

  // ── SSE subscription ──────────────────────────────────────────────────────

  React.useEffect(() => {
    const es = new EventSource('/api/chat/sse');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as Record<string, unknown>;

        if (ev.type === 'chat:message') {
          const msg = ev.message as MessageRow;
          if (msg.conversationId === activeConvId) {
            // Avoid duplicating own messages (already added optimistically)
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Mark as read immediately
            fetch(`/api/v1/chat/conversations/${msg.conversationId}/read`, {
              method: 'POST', credentials: 'include',
            }).catch(() => {});
          } else {
            // Increment unread for other conversation
            setConversations((prev) => prev.map((c) =>
              c.id === msg.conversationId
                ? { ...c, unreadCount: c.unreadCount + 1, lastMessagePreview: msg.content }
                : c,
            ));
          }
          // Refresh conversation list
          loadConversations();
        }

        if (ev.type === 'chat:typing') {
          const { conversationId, userId, userName } = ev as {
            conversationId: string; userId: string; userName: string;
          };
          setTypingMap((prev) => {
            const existing = (prev[conversationId] ?? []).filter(
              (t) => t.userId !== userId && t.expiresAt > Date.now(),
            );
            return {
              ...prev,
              [conversationId]: [...existing, { userId, userName, expiresAt: Date.now() + 3000 }],
            };
          });
          setTimeout(() => {
            setTypingMap((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] ?? []).filter((t) => t.expiresAt > Date.now()),
            }));
          }, 3200);
        }

        if (ev.type === 'chat:conversation:new') {
          loadConversations();
        }
      } catch {}
    };
    return () => es.close();
  }, [activeConvId, loadConversations]);

  // ── Presence heartbeat ────────────────────────────────────────────────────

  React.useEffect(() => {
    const send = () => {
      fetch('/api/v1/chat/presence', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activePage: activeConvId ? `/chat/${activeConvId}` : '/chat' }),
      }).catch(() => {});
    };
    send();
    const id = setInterval(send, 60_000);
    return () => clearInterval(id);
  }, [activeConvId]);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = React.useCallback(async () => {
    if (!draft.trim() || !activeConvId || sending) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);
    // Optimistic
    const tempId = `tmp-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId, conversationId: activeConvId, senderId: '', senderName: 'Вы',
      type: 'TEXT', content, createdAt: new Date().toISOString(), isOwn: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const r = await fetch(`/api/v1/chat/conversations/${activeConvId}/messages`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const j = await r.json() as { success: boolean; data?: MessageRow };
      if (j.success && j.data) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? j.data! : m));
        setConversations((prev) => prev.map((c) =>
          c.id === activeConvId ? { ...c, lastMessagePreview: content } : c,
        ));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [draft, activeConvId, sending]);

  // ── Typing indicator ──────────────────────────────────────────────────────

  function handleDraftChange(val: string) {
    setDraft(val);
    if (!activeConvId) return;
    const now = Date.now();
    if (now - lastTyping.current > 2000) {
      lastTyping.current = now;
      fetch(`/api/v1/chat/conversations/${activeConvId}/typing`, {
        method: 'POST', credentials: 'include',
      }).catch(() => {});
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { lastTyping.current = 0; }, 2500);
  }

  // ── Keyboard submit ───────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Mute toggle ───────────────────────────────────────────────────────────

  async function handleMuteToggle() {
    if (!activeConvId) return;
    const next = !myMuted;
    setMyMuted(next);
    await fetch(`/api/v1/chat/conversations/${activeConvId}/mute`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ muted: next }),
    }).catch(() => {});
    setConversations((prev) =>
      prev.map((c) => c.id === activeConvId ? { ...c, muted: next } : c),
    );
  }

  // ── New DM ────────────────────────────────────────────────────────────────

  async function handleNewDM(targetUserId: string) {
    setShowNewChat(false);
    setStaffSearch('');
    const r = await fetch('/api/v1/chat/conversations', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DIRECT', memberIds: [targetUserId] }),
    });
    const j = await r.json() as { success: boolean; data?: { conversationId: string } };
    if (j.success && j.data) {
      await loadConversations();
      openConversation(j.data.conversationId);
    }
  }

  // ── New group ─────────────────────────────────────────────────────────────

  async function handleCreateGroup() {
    if (!groupName.trim() || groupMembers.length < 2) return;
    setCreatingGroup(true);
    try {
      const r = await fetch('/api/v1/chat/conversations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'GROUP', name: groupName.trim(), memberIds: groupMembers }),
      });
      const j = await r.json() as { success: boolean; data?: { conversationId: string } };
      if (j.success && j.data) {
        setShowGroupModal(false); setGroupName(''); setGroupMembers([]);
        await loadConversations();
        openConversation(j.data.conversationId);
      }
    } finally { setCreatingGroup(false); }
  }

  // ── Load staff list when modal opens ─────────────────────────────────────

  React.useEffect(() => {
    if (!showNewChat && !showGroupModal) return;
    fetch('/api/chat/users', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (j.success) setStaffList(j.data as StaffUser[]); })
      .catch(() => {});
  }, [showNewChat, showGroupModal]);

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredConvs = convSearch.trim()
    ? conversations.filter((c) => c.name.toLowerCase().includes(convSearch.toLowerCase()))
    : conversations;

  const filteredStaff = staffSearch.trim()
    ? staffList.filter((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(staffSearch.toLowerCase()),
      )
    : staffList;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full animate-fade-in overflow-hidden">

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className={cn(
        'shrink-0 border-r border-border-luxury flex flex-col',
        'w-72 lg:w-80',
        activeConvId ? 'hidden lg:flex' : 'flex w-full lg:w-80',
      )}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-border-luxury">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-text-primary">Сообщения</h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-1.5 rounded-lg bg-champagne/10 border border-champagne/30 text-champagne hover:bg-champagne/20 transition-colors"
              title="Новый чат"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border-luxury">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Поиск сотрудника или чата..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/30"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <MessageCircle className="w-8 h-8 text-text-tertiary" />
              <p className="text-xs text-text-tertiary text-center px-4">
                {convSearch ? 'Ничего не найдено' : 'Нет чатов. Нажмите + чтобы начать.'}
              </p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isActive = conv.id === activeConvId;
              const partner = conv.type === 'DIRECT'
                ? conv.members.find((m) => m.id !== conv.members[0]?.id) ?? conv.members[0]
                : null;
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-3 hover:bg-charcoal/60 transition-colors text-left border-b border-border-luxury/30',
                    isActive && 'bg-charcoal/80',
                  )}
                >
                  <div className="relative shrink-0 mt-0.5">
                    {conv.type === 'GROUP' ? (
                      <div className="w-8 h-8 rounded-full bg-champagne/10 border border-champagne/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-champagne" />
                      </div>
                    ) : (
                      <Avatar name={conv.name} size="sm" />
                    )}
                    {conv.type === 'DIRECT' && partner?.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-onyx" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium text-text-primary truncate">{conv.name}</span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-text-tertiary shrink-0">{timeFmt(conv.lastMessageAt)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-xs text-text-tertiary truncate">
                        {conv.lastMessagePreview ?? (
                          conv.type === 'GROUP'
                            ? `${conv.memberCount} участников`
                            : (partner ? ROLE_LABEL[conv.members.find((m) => m.id !== conv.members[0]?.id)?.position ?? ''] ?? '' : '')
                        )}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        !activeConvId && 'hidden lg:flex',
      )}>
        {activeConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-luxury shrink-0">
              <button
                onClick={() => setActiveConvId(null)}
                className="lg:hidden p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {activeConv.type === 'GROUP' ? (
                <div className="w-8 h-8 rounded-full bg-champagne/10 border border-champagne/20 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-champagne" />
                </div>
              ) : (
                <Avatar name={activeConv.name} size="sm" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{activeConv.name}</p>
                <div className="flex items-center gap-1.5">
                  {activeConv.type === 'DIRECT' && (() => {
                    const partner = activeConv.members.find((m) => m.id !== activeConv.members[0]?.id) ?? activeConv.members[0];
                    return partner?.isOnline ? (
                      <><span className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-[10px] text-green-400">В сети</span></>
                    ) : (
                      <span className="text-[10px] text-text-tertiary">{partner?.position ?? ''}</span>
                    );
                  })()}
                  {activeConv.type === 'GROUP' && (
                    <span className="text-[10px] text-text-tertiary">{activeConv.memberCount} участников</span>
                  )}
                </div>
              </div>

              <button
                onClick={handleMuteToggle}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
                title={myMuted ? 'Включить уведомления' : 'Выключить уведомления'}
              >
                {myMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                </div>
              )}

              {nextCursor && !loadingMore && (
                <button
                  onClick={() => loadMessages(activeConvId!, nextCursor)}
                  className="w-full text-xs text-champagne/70 hover:text-champagne py-2 transition-colors"
                >
                  Загрузить предыдущие сообщения
                </button>
              )}

              {loadingMsgs ? (
                <div className="flex justify-center pt-12">
                  <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 pt-12">
                  <MessageCircle className="w-10 h-10 text-text-tertiary" />
                  <p className="text-sm text-text-secondary">Начните переписку</p>
                  <p className="text-xs text-text-tertiary">Первое сообщение ещё не отправлено</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showDate = !prev || !isSameDay(msg.createdAt, prev.createdAt);
                  const showSender = !msg.isOwn &&
                    activeConv.type === 'GROUP' &&
                    msg.type === 'TEXT' &&
                    (!prev || prev.senderId !== msg.senderId || showDate || prev.type === 'SYSTEM');

                  if (msg.type === 'SYSTEM') {
                    return (
                      <div key={msg.id}>
                        {showDate && <DateSep label={dateSeparatorLabel(msg.createdAt)} />}
                        <p className="text-center text-[11px] text-text-tertiary italic py-1.5">{msg.content}</p>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id}>
                      {showDate && <DateSep label={dateSeparatorLabel(msg.createdAt)} />}
                      <div className={cn('flex gap-2 mb-0.5', msg.isOwn ? 'justify-end' : 'justify-start')}>
                        {!msg.isOwn && activeConv.type === 'GROUP' && (
                          <div className="w-7 h-7 shrink-0 mt-1">
                            {showSender && <Avatar name={msg.senderName} size="xs" />}
                          </div>
                        )}
                        <div className="max-w-[70%]">
                          {showSender && (
                            <p className="text-[10px] font-semibold text-champagne mb-0.5 ml-0.5">{msg.senderName}</p>
                          )}
                          <div className={cn(
                            'px-3.5 py-2.5 rounded-2xl text-sm',
                            msg.isOwn
                              ? 'bg-champagne text-obsidian rounded-br-sm'
                              : 'bg-charcoal border border-border-luxury text-text-primary rounded-bl-sm',
                          )}>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                            <div className={cn('flex items-center justify-end gap-1 mt-1', msg.isOwn ? 'text-obsidian/60' : 'text-text-tertiary')}>
                              <span className="text-[10px]">{timeFmt(msg.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-tertiary italic">
                    {typingUsers.map((t) => t.userName).join(', ')} печатает...
                  </p>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 border-t border-border-luxury px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — новая строка)"
                  rows={1}
                  className={cn(
                    'flex-1 px-3.5 py-2.5 rounded-xl text-sm resize-none overflow-hidden',
                    'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all',
                    'max-h-32',
                  )}
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className={cn(
                    'p-2.5 rounded-xl transition-colors shrink-0',
                    draft.trim() ? 'bg-champagne text-obsidian hover:bg-champagne/80' : 'bg-charcoal text-text-tertiary',
                  )}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="p-5 rounded-2xl bg-charcoal">
              <MessageCircle className="w-10 h-10 text-text-tertiary" />
            </div>
            <div className="text-center">
              <p className="text-text-primary font-medium">Выберите чат или начните новый</p>
              <p className="text-sm text-text-tertiary mt-1">Нажмите + в левой панели, чтобы написать кому-либо</p>
            </div>
          </div>
        )}
      </div>

      {/* ── New chat modal ──────────────────────────────────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowNewChat(false); setStaffSearch(''); } }}>
          <div className="w-full max-w-sm bg-obsidian border border-border-luxury rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-luxury">
              <p className="text-sm font-semibold text-text-primary">Новый чат</p>
              <button onClick={() => { setShowNewChat(false); setStaffSearch(''); }}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-border-luxury">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                <input
                  autoFocus
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Поиск по имени..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/30"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredStaff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleNewDM(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-charcoal/60 transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" />
                    {s.online && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-obsidian" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-text-tertiary">{s.specialization ?? ROLE_LABEL[s.role] ?? s.role}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border-luxury">
              <button
                onClick={() => { setShowNewChat(false); setShowGroupModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-champagne/30 text-champagne/70 hover:bg-champagne/5 hover:text-champagne transition-colors text-sm"
              >
                <Users className="w-4 h-4" /> Создать групповой чат →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group chat modal ────────────────────────────────────────────── */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowGroupModal(false); setGroupName(''); setGroupMembers([]); } }}>
          <div className="w-full max-w-md bg-obsidian border border-border-luxury rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-luxury">
              <p className="text-base font-semibold text-text-primary">Создать группу</p>
              <button onClick={() => { setShowGroupModal(false); setGroupName(''); setGroupMembers([]); }}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Название группы *</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Например: Косметологи"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Участники * <span className="text-text-tertiary">({groupMembers.length} выбрано, мин. 2)</span>
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                  <input
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/30"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-border-luxury p-2">
                  {filteredStaff.map((s) => {
                    const sel = groupMembers.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setGroupMembers((prev) => sel ? prev.filter((id) => id !== s.id) : [...prev, s.id])}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                          sel ? 'bg-champagne/10 border border-champagne/30' : 'hover:bg-charcoal/60',
                        )}
                      >
                        <div className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                          sel ? 'border-champagne bg-champagne' : 'border-text-tertiary',
                        )}>
                          {sel && <Check className="w-3 h-3 text-obsidian" />}
                        </div>
                        <Avatar name={`${s.firstName} ${s.lastName}`} size="xs" />
                        <div>
                          <p className={cn('text-sm font-medium', sel ? 'text-champagne' : 'text-text-primary')}>{s.firstName} {s.lastName}</p>
                          <p className="text-[10px] text-text-tertiary">{s.specialization ?? ROLE_LABEL[s.role] ?? s.role}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border-luxury">
              <button
                onClick={() => { setShowGroupModal(false); setGroupName(''); setGroupMembers([]); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || groupMembers.length < 2 || creatingGroup}
                className="flex-1 px-4 py-2.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors disabled:opacity-50"
              >
                {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border-luxury/30" />
      <span className="text-[10px] text-text-tertiary shrink-0 px-1">{label}</span>
      <div className="flex-1 h-px bg-border-luxury/30" />
    </div>
  );
}
