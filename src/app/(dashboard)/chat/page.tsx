'use client';

import * as React from 'react';
import { MessageCircle, Send, Search, Circle, Globe } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  specialization: string | null;
  color: string | null;
  online: boolean;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  specialization: string | null;
  color: string | null;
  lastMessage: { body: string; createdAt: string; isOwn: boolean } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  fromUserId: string;
  toUserId: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  isOwn: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Администратор',
  SPECIALIST: 'Специалист',
  OPERATOR: 'Оператор',
  SUPER_ADMIN: 'Супер-администратор',
};

const PUBLIC_CHANNEL_ID = '__public__';

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function ChatPage() {
  const [staff, setStaff] = React.useState<StaffUser[]>([]);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [loadingMessages, setLoadingMessages] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch('/api/chat/users')
      .then((r) => r.json())
      .then((json) => { if (json.success) setStaff(json.data); });
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const res = await fetch('/api/chat/conversations');
    const json = await res.json();
    if (json.success) setConversations(json.data);
  };

  const fetchMessages = React.useCallback(async (partnerId: string) => {
    setLoadingMessages(true);
    try {
      const url = partnerId === PUBLIC_CHANNEL_ID
        ? '/api/chat/messages?channel=public'
        : `/api/chat/messages?with=${partnerId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setMessages(json.data);
        if (partnerId !== PUBLIC_CHANNEL_ID) fetchConversations();
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  React.useEffect(() => {
    if (activePartnerId) fetchMessages(activePartnerId);
  }, [activePartnerId, fetchMessages]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    const es = new EventSource('/api/chat/sse');
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'message') {
          const msg: Message = payload.message;
          const isPublic = msg.toUserId === null || payload.message?.channel === 'public';
          if (isPublic && activePartnerId === PUBLIC_CHANNEL_ID) {
            setMessages((prev) => [...prev, msg]);
          } else if (!isPublic && (msg.fromUserId === activePartnerId || msg.toUserId === activePartnerId)) {
            setMessages((prev) => [...prev, msg]);
          }
          fetchConversations();
        }
      } catch {}
    };
    return () => es.close();
  }, [activePartnerId]);

  const handleSend = async () => {
    if (!draft.trim() || !activePartnerId || sending) return;
    const body = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const isPublic = activePartnerId === PUBLIC_CHANNEL_ID;
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPublic ? { body } : { toUserId: activePartnerId, body }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        if (!isPublic) fetchConversations();
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openConversation = (partnerId: string) => {
    setActivePartnerId(partnerId);
    setMessages([]);
  };

  const conversationPartnerIds = new Set(conversations.map((c) => c.partnerId));
  const staffNotInConversation = staff.filter((s) => !conversationPartnerIds.has(s.id));

  const filteredConversations = search
    ? conversations.filter((c) => c.partnerName.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const filteredStaff = search
    ? staffNotInConversation.filter((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()),
      )
    : staffNotInConversation;

  const activeStaff = staff.find((s) => s.id === activePartnerId);
  const activeConv = conversations.find((c) => c.partnerId === activePartnerId);

  const activePartnerName =
    activePartnerId === PUBLIC_CHANNEL_ID ? 'Общий чат' :
    activeConv?.partnerName ??
    (activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : '');

  const activePartnerSub =
    activePartnerId === PUBLIC_CHANNEL_ID ? 'Все сотрудники' :
    activeConv?.specialization ??
    ROLE_LABEL[activeConv?.partnerRole ?? activeStaff?.role ?? ''] ?? '';

  const activeIsOnline = activePartnerId !== PUBLIC_CHANNEL_ID && (activeStaff?.online ?? false);

  return (
    <div className="flex h-full animate-fade-in">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border-luxury flex flex-col">
        <div className="px-4 py-4 border-b border-border-luxury">
          <h2 className="font-serif text-lg font-medium text-text-primary">Чат сотрудников</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Внутренняя переписка</p>
        </div>

        <div className="px-3 py-2 border-b border-border-luxury">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск сотрудников..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Public channel — always at top when not searching */}
          {!search && (
            <button
              onClick={() => openConversation(PUBLIC_CHANNEL_ID)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 hover:bg-charcoal/60 transition-colors text-left border-b border-border-luxury',
                activePartnerId === PUBLIC_CHANNEL_ID && 'bg-charcoal/80',
              )}
            >
              <div className="w-8 h-8 rounded-full bg-champagne/10 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-champagne" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Общий чат</p>
                <p className="text-xs text-text-tertiary">Все сотрудники</p>
              </div>
            </button>
          )}

          {/* Existing DM conversations */}
          {filteredConversations.map((c) => (
            <button
              key={c.partnerId}
              onClick={() => openConversation(c.partnerId)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-3 hover:bg-charcoal/60 transition-colors text-left',
                activePartnerId === c.partnerId && 'bg-charcoal/80',
              )}
            >
              <div className="relative shrink-0 mt-0.5">
                <Avatar name={c.partnerName} size="sm" />
                {c.color && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-onyx"
                    style={{ backgroundColor: c.color }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-text-primary truncate">{c.partnerName}</span>
                  {c.lastMessage && (
                    <span className="text-[10px] text-text-tertiary shrink-0">
                      {timeLabel(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-xs text-text-tertiary truncate">
                    {c.lastMessage
                      ? `${c.lastMessage.isOwn ? 'Вы: ' : ''}${c.lastMessage.body}`
                      : ROLE_LABEL[c.partnerRole] ?? c.partnerRole}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-champagne text-obsidian text-[10px] font-bold">
                      {c.unreadCount > 9 ? '9+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Staff without a DM yet */}
          {filteredStaff.length > 0 && (
            <>
              {filteredConversations.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Все сотрудники</p>
                </div>
              )}
              {filteredStaff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openConversation(s.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 hover:bg-charcoal/60 transition-colors text-left',
                    activePartnerId === s.id && 'bg-charcoal/80',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" />
                    {s.color && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-onyx"
                        style={{ backgroundColor: s.color }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {s.firstName} {s.lastName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Circle
                        className={cn('w-1.5 h-1.5 fill-current', s.online ? 'text-green-400' : 'text-text-tertiary')}
                      />
                      <p className="text-xs text-text-tertiary">
                        {s.online ? 'Онлайн' : ROLE_LABEL[s.role] ?? s.role}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {filteredConversations.length === 0 && filteredStaff.length === 0 && search && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <MessageCircle className="w-8 h-8 text-text-tertiary" />
              <p className="text-xs text-text-tertiary">Сотрудников не найдено</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activePartnerId ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-luxury shrink-0">
              {activePartnerId === PUBLIC_CHANNEL_ID ? (
                <div className="w-8 h-8 rounded-full bg-champagne/10 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-champagne" />
                </div>
              ) : (
                <Avatar name={activePartnerName} size="sm" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">{activePartnerName}</p>
                <div className="flex items-center gap-1.5">
                  {activePartnerId !== PUBLIC_CHANNEL_ID && (
                    <Circle
                      className={cn(
                        'w-1.5 h-1.5 fill-current',
                        activeIsOnline ? 'text-green-400' : 'text-text-tertiary',
                      )}
                    />
                  )}
                  <p className="text-xs text-text-tertiary">{activePartnerSub}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center pt-8">
                  <div className="w-5 h-5 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <MessageCircle className="w-10 h-10 text-text-tertiary" />
                  <p className="text-sm text-text-secondary">
                    {activePartnerId === PUBLIC_CHANNEL_ID ? 'Общий чат пуст' : 'Начните переписку'}
                  </p>
                  <p className="text-xs text-text-tertiary">Напишите первое сообщение</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex', msg.isOwn ? 'justify-end' : 'justify-start')}
                  >
                    {!msg.isOwn && activePartnerId === PUBLIC_CHANNEL_ID && (
                      <div className="w-7 h-7 rounded-full bg-charcoal border border-border-luxury flex items-center justify-center mr-2 mt-1 shrink-0 text-xs font-medium text-text-tertiary">
                        {(() => {
                          const s = staff.find((u) => u.id === msg.fromUserId);
                          return s ? s.firstName[0] : '?';
                        })()}
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] px-3.5 py-2 rounded-2xl text-sm',
                        msg.isOwn
                          ? 'bg-champagne rounded-br-sm'
                          : 'bg-charcoal rounded-bl-sm border border-border-luxury',
                      )}
                    >
                      {!msg.isOwn && activePartnerId === PUBLIC_CHANNEL_ID && (
                        <p className="text-[10px] font-semibold text-champagne mb-1">
                          {(() => {
                            const s = staff.find((u) => u.id === msg.fromUserId);
                            return s ? `${s.firstName} ${s.lastName}` : 'Сотрудник';
                          })()}
                        </p>
                      )}
                      <p className={cn('whitespace-pre-wrap break-words', msg.isOwn ? 'text-[#0A0A0F]' : 'text-text-primary')}>{msg.body}</p>
                      <p
                        className={cn(
                          'text-[10px] mt-1 text-right',
                          msg.isOwn ? 'text-[#0A0A0F]/70' : 'text-text-tertiary',
                        )}
                      >
                        {timeLabel(msg.createdAt)}
                        {msg.isOwn && msg.readAt && ' · Прочитано'}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="shrink-0 border-t border-border-luxury px-4 py-3">
              <div className="flex items-end gap-2">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activePartnerId === PUBLIC_CHANNEL_ID ? 'Написать в общий чат...' : 'Написать сообщение...'}
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className={cn(
                    'p-2.5 rounded-xl transition-colors shrink-0',
                    draft.trim()
                      ? 'bg-champagne text-obsidian hover:bg-champagne/80'
                      : 'bg-charcoal text-text-tertiary',
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-2xl bg-charcoal">
              <MessageCircle className="w-10 h-10 text-text-tertiary" />
            </div>
            <div className="text-center">
              <p className="text-text-primary font-medium">Выберите собеседника</p>
              <p className="text-sm text-text-tertiary mt-1">Или откройте общий чат сотрудников</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
