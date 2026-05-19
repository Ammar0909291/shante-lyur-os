'use client';

import * as React from 'react';
import { Send, RefreshCw, Users, Lock, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string | null;
  recipientName: string | null;
  content: string;
  appointmentId: string | null;
  profileId: string | null;
  visibility: 'BROADCAST' | 'DIRECT';
  isRead: boolean;
  createdAt: string;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Суперадмин',
  ADMIN:       'Администратор',
  OPERATOR:    'Оператор',
  SPECIALIST:  'Специалист',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Recipient Dropdown ───────────────────────────────────────────────────────

function RecipientDropdown({
  staff,
  value,
  onChange,
}: {
  staff: StaffMember[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const selected = value ? staff.find(s => s.id === value) : null;
  const label = selected ? `${selected.firstName} ${selected.lastName}` : 'Все сотрудники';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border-luxury',
          'bg-charcoal text-text-secondary hover:text-text-primary transition-colors',
          open && 'border-champagne/40 text-text-primary',
        )}
      >
        {selected ? <Lock className="w-3.5 h-3.5 shrink-0 text-champagne/60" /> : <Users className="w-3.5 h-3.5 shrink-0" />}
        <span className="truncate max-w-[120px]">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-20 w-52 rounded-xl bg-onyx border border-border-luxury shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn(
              'flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors',
              !value ? 'text-champagne bg-champagne/8' : 'text-text-secondary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            <Users className="w-3.5 h-3.5 shrink-0" /> Все сотрудники
          </button>
          {staff.length > 0 && <div className="border-t border-border-luxury" />}
          {staff.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange(s.id); setOpen(false); }}
              className={cn(
                'flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors',
                value === s.id ? 'text-champagne bg-champagne/8' : 'text-text-secondary hover:text-text-primary hover:bg-charcoal',
              )}
            >
              <Lock className="w-3.5 h-3.5 shrink-0 text-champagne/50" />
              <span className="truncate">{s.firstName} {s.lastName}</span>
              <span className="ml-auto text-[10px] text-text-tertiary shrink-0">{ROLE_LABELS[s.role] ?? s.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message Card ─────────────────────────────────────────────────────────────

function MessageCard({
  message,
  isMine,
}: {
  message: Message;
  isMine: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-3 group', isMine && 'flex-row-reverse')}>
      <div className="shrink-0 mt-0.5">
        <Avatar name={message.senderName} size="sm" />
      </div>
      <div className={cn('max-w-[72%] space-y-1', isMine && 'items-end')}>
        <div className={cn('flex items-center gap-2 text-xs text-text-tertiary', isMine && 'flex-row-reverse')}>
          <span className="font-medium text-text-secondary">{isMine ? 'Вы' : message.senderName}</span>
          {message.visibility === 'DIRECT' && (
            <span className="flex items-center gap-1 text-champagne/60">
              <Lock className="w-2.5 h-2.5" />
              <span>{isMine ? message.recipientName : 'личное'}</span>
            </span>
          )}
          <span>{formatTime(message.createdAt)}</span>
        </div>
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
            isMine
              ? 'bg-champagne/10 text-text-primary rounded-tr-sm'
              : 'bg-charcoal border border-border-luxury text-text-primary rounded-tl-sm',
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'all' | 'direct' | 'broadcast';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all',       label: 'Все' },
  { key: 'broadcast', label: 'Общие' },
  { key: 'direct',    label: 'Личные' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [staff, setStaff] = React.useState<StaffMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>('all');
  const [content, setContent] = React.useState('');
  const [recipientId, setRecipientId] = React.useState<string | null>(null);
  const feedRef = React.useRef<HTMLDivElement>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const visParam = tab === 'broadcast' ? '&visibility=BROADCAST'
                     : tab === 'direct'    ? '&visibility=DIRECT'
                     : '';
      const res = await apiFetch(`/api/messages?limit=60${visParam}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Не удалось загрузить сообщения');
        return;
      }
      setMessages(json.data?.items ?? []);
    } catch {
      setError('Не удалось загрузить сообщения');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadStaff() {
    try {
      const res = await apiFetch('/api/staff');
      const json = await res.json();
      if (res.ok && json.success) setStaff(json.data ?? []);
    } catch { /* non-critical */ }
  }

  React.useEffect(() => {
    load();
    loadStaff();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = { content: content.trim() };
      if (recipientId) body.recipientId = recipientId;
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Не удалось отправить сообщение');
        return;
      }
      setContent('');
      await load(true);
    } catch {
      setError('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend(e as unknown as React.FormEvent);
    }
  }

  const visibleMessages = messages.filter(m => {
    if (tab === 'broadcast') return m.visibility === 'BROADCAST';
    if (tab === 'direct')    return m.visibility === 'DIRECT';
    return true;
  });

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Коммуникация</h2>
          <p className="text-text-secondary mt-1 text-sm">Внутренние сообщения команды</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />}
          onClick={() => load()}
          disabled={loading}
        >
          Обновить
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 shrink-0 bg-charcoal rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-onyx text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Message feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto min-h-0 bg-onyx border border-border-luxury rounded-2xl p-4 space-y-4 mb-4"
      >
        {loading && (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-sm">Загрузка...</div>
        )}
        {!loading && error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {!loading && !error && visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-text-primary font-medium">Сообщений пока нет</p>
            <p className="text-text-tertiary text-sm">Напишите первым — команда увидит сообщение</p>
          </div>
        )}
        {!loading && visibleMessages.map(m => (
          <MessageCard key={m.id} message={m} isMine={m.senderId === user?.id} />
        ))}
      </div>

      {/* Compose */}
      <div className="shrink-0 bg-onyx border border-border-luxury rounded-2xl p-4">
        <form onSubmit={handleSend} className="space-y-3">
          {/* Recipient row */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary shrink-0">Кому:</span>
            <RecipientDropdown staff={staff} value={recipientId} onChange={setRecipientId} />
            {recipientId && (
              <span className="text-xs text-champagne/60 flex items-center gap-1">
                <Lock className="w-3 h-3" /> личное сообщение
              </span>
            )}
          </div>

          {/* Text area + send */}
          <div className="flex gap-3 items-end">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение… (⌘↵ для отправки)"
              rows={2}
              className={cn(
                'flex-1 resize-none rounded-xl px-4 py-2.5 text-sm',
                'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
                'transition-colors',
              )}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              isLoading={sending}
              disabled={!content.trim() || sending}
            >
              Отправить
            </Button>
          </div>
          <p className="text-[10px] text-text-tertiary">
            {recipientId ? 'Личное сообщение — видно только вам и получателю' : 'Общее сообщение — видно всем сотрудникам'}
          </p>
        </form>
      </div>
    </div>
  );
}
