'use client';

import * as React from 'react';
import {
  Send,
  Search,
  Hash,
  Lock,
  Circle,
  MoreVertical,
  Paperclip,
  Smile,
  Users,
  Plus,
  CheckCheck,
  Check,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelType = 'public' | 'private' | 'direct';
type MessageStatus = 'sent' | 'delivered' | 'read';

interface ChatUser {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
}

interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  description?: string;
  members: number;
  unread: number;
  lastMessage?: string;
  lastMessageTime?: string;
  participants?: ChatUser[];
}

interface Message {
  id: string;
  channelId: string;
  author: ChatUser;
  text: string;
  timestamp: string;
  status: MessageStatus;
  isOwn: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USERS: ChatUser[] = [
  { id: 'u1', name: 'Наталья Владимирова', role: 'Массажист', status: 'online' },
  { id: 'u2', name: 'Ольга Козлова', role: 'Массажист', status: 'online' },
  { id: 'u3', name: 'Дарья Соколова', role: 'Массажист', status: 'away', lastSeen: '5 мин назад' },
  { id: 'u4', name: 'Мария Волкова', role: 'Косметолог', status: 'online' },
  { id: 'u5', name: 'Ирина Соколова', role: 'Косметолог', status: 'offline', lastSeen: '2 ч назад' },
  { id: 'u6', name: 'Администратор', role: 'Администратор', status: 'online' },
];

const MOCK_CHANNELS: Channel[] = [
  {
    id: 'ch1', type: 'public', name: 'Общий', description: 'Общий чат команды', members: 6, unread: 3,
    lastMessage: 'Завтра новая клиентка — Виктория О., будьте готовы', lastMessageTime: '14:32',
  },
  {
    id: 'ch2', type: 'public', name: 'Массаж', description: 'Команда массажа', members: 3, unread: 0,
    lastMessage: 'Ароматическое масло закончилось, нужно заказать', lastMessageTime: '12:10',
  },
  {
    id: 'ch3', type: 'public', name: 'Косметология', description: 'Команда косметологов', members: 2, unread: 1,
    lastMessage: 'Пришли новые препараты гиалуроновой кислоты', lastMessageTime: '11:45',
  },
  {
    id: 'ch4', type: 'private', name: 'Операционный', description: 'Оперативные вопросы', members: 4, unread: 0,
    lastMessage: 'Запись на 16:00 перенесена', lastMessageTime: 'вчера',
  },
  {
    id: 'dm1', type: 'direct', name: 'Наталья Владимирова', members: 2, unread: 2,
    lastMessage: 'Могу взять дополнительную запись сегодня', lastMessageTime: '13:58',
    participants: [MOCK_USERS[0]],
  },
  {
    id: 'dm2', type: 'direct', name: 'Мария Волкова', members: 2, unread: 0,
    lastMessage: 'Спасибо, поняла!', lastMessageTime: 'вчера',
    participants: [MOCK_USERS[3]],
  },
];

function buildMessages(channelId: string): Message[] {
  const admin = MOCK_USERS[5];
  const nat = MOCK_USERS[0];
  const olga = MOCK_USERS[1];
  const maria = MOCK_USERS[3];
  const irina = MOCK_USERS[4];

  const maps: Record<string, Message[]> = {
    ch1: [
      { id: 'm1', channelId: 'ch1', author: admin, text: 'Доброе утро, команда! Сегодня насыщенный день — 18 записей.', timestamp: '09:01', status: 'read', isOwn: true },
      { id: 'm2', channelId: 'ch1', author: nat, text: 'Готова! У меня 6 записей, начинаю в 10:00.', timestamp: '09:05', status: 'read', isOwn: false },
      { id: 'm3', channelId: 'ch1', author: olga, text: 'Буду в 9:30, нужно подготовить кабинет.', timestamp: '09:08', status: 'read', isOwn: false },
      { id: 'm4', channelId: 'ch1', author: maria, text: 'Пришли новые препараты для биоревитализации. Распаковала, всё ок.', timestamp: '10:15', status: 'read', isOwn: false },
      { id: 'm5', channelId: 'ch1', author: irina, text: 'Отлично! Можно уже использовать сегодня?', timestamp: '10:18', status: 'read', isOwn: false },
      { id: 'm6', channelId: 'ch1', author: maria, text: 'Да, всё в норме. Храним в холодильнике как обычно.', timestamp: '10:20', status: 'read', isOwn: false },
      { id: 'm7', channelId: 'ch1', author: admin, text: 'Завтра новая клиентка — Виктория О., будьте готовы', timestamp: '14:32', status: 'delivered', isOwn: true },
    ],
    ch2: [
      { id: 'm1', channelId: 'ch2', author: nat, text: 'Коллеги, масло миндальное почти закончилось, остаток на 1–2 сеанса.', timestamp: '11:00', status: 'read', isOwn: false },
      { id: 'm2', channelId: 'ch2', author: olga, text: 'Подтверждаю. Я уже внесла в список заказа.', timestamp: '11:10', status: 'read', isOwn: false },
      { id: 'm3', channelId: 'ch2', author: admin, text: 'Приняла, закажу сегодня. Что-то ещё нужно?', timestamp: '11:30', status: 'read', isOwn: true },
      { id: 'm4', channelId: 'ch2', author: nat, text: 'Ароматическое масло закончилось, нужно заказать', timestamp: '12:10', status: 'read', isOwn: false },
    ],
    ch3: [
      { id: 'm1', channelId: 'ch3', author: irina, text: 'Напоминаю: у нас новый протокол для RF-лифтинга с 1 июня. Буду обучать в субботу.', timestamp: '10:00', status: 'read', isOwn: false },
      { id: 'm2', channelId: 'ch3', author: admin, text: 'Хорошо, занесу в расписание. Во сколько?', timestamp: '10:05', status: 'read', isOwn: true },
      { id: 'm3', channelId: 'ch3', author: irina, text: 'В 10:00, займёт около 2 часов.', timestamp: '10:07', status: 'read', isOwn: false },
      { id: 'm4', channelId: 'ch3', author: maria, text: 'Пришли новые препараты гиалуроновой кислоты', timestamp: '11:45', status: 'sent', isOwn: false },
    ],
    dm1: [
      { id: 'm1', channelId: 'dm1', author: MOCK_USERS[5], text: 'Наталья, привет! Клиентка в 15:30 отменила запись. Есть слот.', timestamp: '13:45', status: 'read', isOwn: true },
      { id: 'm2', channelId: 'dm1', author: nat, text: 'Поняла, спасибо! А что за клиентка была?', timestamp: '13:50', status: 'read', isOwn: false },
      { id: 'm3', channelId: 'dm1', author: MOCK_USERS[5], text: 'Виктория Орлова, хотела тайский массаж 90 мин.', timestamp: '13:52', status: 'read', isOwn: true },
      { id: 'm4', channelId: 'dm1', author: nat, text: 'Могу взять дополнительную запись сегодня', timestamp: '13:58', status: 'delivered', isOwn: false },
    ],
    dm2: [
      { id: 'm1', channelId: 'dm2', author: MOCK_USERS[5], text: 'Мария, клиентка на 12:00 пришла раньше на 20 минут.', timestamp: 'вчера 11:38', status: 'read', isOwn: true },
      { id: 'm2', channelId: 'dm2', author: maria, text: 'Окей, сейчас освобожусь через 5 минут.', timestamp: 'вчера 11:40', status: 'read', isOwn: false },
      { id: 'm3', channelId: 'dm2', author: MOCK_USERS[5], text: 'Хорошо, она подождёт в зоне отдыха.', timestamp: 'вчера 11:41', status: 'read', isOwn: true },
      { id: 'm4', channelId: 'dm2', author: maria, text: 'Спасибо, поняла!', timestamp: 'вчера 11:42', status: 'read', isOwn: false },
    ],
  };
  return maps[channelId] ?? [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-text-tertiary" />;
  return <Check className="w-3.5 h-3.5 text-text-tertiary" />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [channels] = React.useState<Channel[]>(MOCK_CHANNELS);
  const [activeChannelId, setActiveChannelId] = React.useState<string>('ch1');
  const [messages, setMessages] = React.useState<Record<string, Message[]>>({});
  const [input, setInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [showMembers, setShowMembers] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  React.useEffect(() => {
    if (!messages[activeChannelId]) {
      setMessages(prev => ({ ...prev, [activeChannelId]: buildMessages(activeChannelId) }));
    }
  }, [activeChannelId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      author: MOCK_USERS[5],
      text,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      isOwn: true,
    };
    setMessages(prev => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] ?? []), newMsg],
    }));
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const filteredChannels = React.useMemo(() => {
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(c => c.name.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q));
  }, [channels, search]);

  const publicChannels = filteredChannels.filter(c => c.type === 'public');
  const privateChannels = filteredChannels.filter(c => c.type === 'private');
  const dms = filteredChannels.filter(c => c.type === 'direct');
  const currentMessages = messages[activeChannelId] ?? [];

  const totalUnread = channels.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="flex h-[calc(100vh-65px)] animate-fade-in overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border-luxury bg-onyx flex flex-col">

        {/* Header */}
        <div className="px-4 py-4 border-b border-border-luxury">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-medium text-text-primary">Чат</h2>
            {totalUnread > 0 && (
              <span className="text-xs font-bold bg-champagne/20 text-champagne px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'w-full pl-8 pr-3 py-2 rounded-xl text-xs',
                'bg-charcoal border border-border-luxury',
                'text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:border-champagne/40 transition-all',
              )}
            />
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {/* Public channels */}
          {publicChannels.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary px-2 py-2">Каналы</p>
              {publicChannels.map(ch => (
                <ChannelItem key={ch.id} channel={ch} active={activeChannelId === ch.id} onClick={() => setActiveChannelId(ch.id)} />
              ))}
            </>
          )}

          {/* Private */}
          {privateChannels.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary px-2 py-2 mt-2">Закрытые</p>
              {privateChannels.map(ch => (
                <ChannelItem key={ch.id} channel={ch} active={activeChannelId === ch.id} onClick={() => setActiveChannelId(ch.id)} />
              ))}
            </>
          )}

          {/* DMs */}
          {dms.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary px-2 py-2 mt-2">Личные сообщения</p>
              {dms.map(ch => (
                <ChannelItem key={ch.id} channel={ch} active={activeChannelId === ch.id} onClick={() => setActiveChannelId(ch.id)} />
              ))}
            </>
          )}
        </div>

        {/* Online members */}
        <div className="border-t border-border-luxury p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-2">
            Онлайн · {MOCK_USERS.filter(u => u.status === 'online').length}
          </p>
          <div className="space-y-1.5">
            {MOCK_USERS.filter(u => u.status !== 'offline').map(user => (
              <div key={user.id} className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <Avatar name={user.name} size="xs" />
                  <StatusDot status={user.status} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-primary truncate">{user.name.split(' ')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Message area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-charcoal/20">

        {/* Channel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-luxury bg-onyx shrink-0">
          <div className="flex items-center gap-3">
            <ChannelIcon type={activeChannel?.type ?? 'public'} className="w-5 h-5 text-champagne" />
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{activeChannel?.name}</h3>
              {activeChannel?.description && (
                <p className="text-xs text-text-tertiary">{activeChannel.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(s => !s)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                showMembers
                  ? 'bg-champagne/15 text-champagne border-champagne/20'
                  : 'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary',
              )}
            >
              <Users className="w-3.5 h-3.5" />
              {activeChannel?.members}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-champagne/8 flex items-center justify-center mb-3">
                <Hash className="w-6 h-6 text-champagne" />
              </div>
              <p className="text-sm font-medium text-text-primary">Начните общение</p>
              <p className="text-xs text-text-tertiary mt-1">Здесь пока нет сообщений</p>
            </div>
          ) : (
            currentMessages.map((msg, i) => {
              const prevMsg = currentMessages[i - 1];
              const showAvatar = !prevMsg || prevMsg.author.id !== msg.author.id;
              return (
                <MessageBubble key={msg.id} message={msg} showAvatar={showAvatar} />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-5 py-4 border-t border-border-luxury bg-onyx">
          <div className={cn(
            'flex items-end gap-3 rounded-2xl px-4 py-3',
            'bg-charcoal border border-border-luxury',
            'focus-within:border-champagne/40 transition-all',
          )}>
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Написать в ${activeChannel?.type === 'direct' ? activeChannel.name : '#' + activeChannel?.name}...`}
              className={cn(
                'flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary',
                'resize-none focus:outline-none leading-relaxed max-h-32',
              )}
              style={{ minHeight: '24px' }}
            />
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              <button className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-charcoal/50 transition-all">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-charcoal/50 transition-all">
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all ml-1',
                  input.trim()
                    ? 'bg-champagne text-obsidian hover:bg-champagne/90 shadow-[0_2px_8px_rgba(212,175,122,0.3)]'
                    : 'bg-charcoal/50 text-text-tertiary cursor-not-allowed',
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-text-tertiary mt-2 px-1">
            Enter — отправить · Shift+Enter — новая строка
          </p>
        </div>
      </div>

      {/* ── Members panel ────────────────────────────────────────────────── */}
      {showMembers && (
        <div className="w-56 shrink-0 border-l border-border-luxury bg-onyx flex flex-col">
          <div className="px-4 py-4 border-b border-border-luxury">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              Участники · {MOCK_USERS.length}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {MOCK_USERS.map(user => (
              <div key={user.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-charcoal/40 transition-colors">
                <div className="relative shrink-0">
                  <Avatar name={user.name} size="sm" />
                  <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-onyx',
                    user.status === 'online' ? 'bg-sage' : user.status === 'away' ? 'bg-amber-400' : 'bg-border-light',
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary truncate">{user.name}</p>
                  <p className="text-[10px] text-text-tertiary">{user.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChannelIcon({ type, className }: { type: ChannelType; className?: string }) {
  if (type === 'private') return <Lock className={className} />;
  if (type === 'direct') return <Circle className={className} />;
  return <Hash className={className} />;
}

function ChannelItem({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all',
        active
          ? 'bg-champagne/12 text-champagne'
          : 'text-text-secondary hover:bg-charcoal/60 hover:text-text-primary',
      )}
    >
      {channel.type === 'direct' && channel.participants?.[0] ? (
        <div className="relative shrink-0">
          <Avatar name={channel.participants[0].name} size="xs" />
          <StatusDot status={channel.participants[0].status} />
        </div>
      ) : (
        <ChannelIcon type={channel.type} className={cn('w-4 h-4 shrink-0', active ? 'text-champagne' : 'text-text-tertiary')} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm truncate font-medium">{channel.name}</span>
          {channel.unread > 0 && (
            <span className="text-[10px] font-bold bg-champagne/20 text-champagne px-1.5 py-0.5 rounded-full shrink-0">
              {channel.unread}
            </span>
          )}
        </div>
        {channel.lastMessage && (
          <p className="text-xs text-text-tertiary truncate mt-0.5">{channel.lastMessage}</p>
        )}
      </div>
    </button>
  );
}

function StatusDot({ status }: { status: ChatUser['status'] }) {
  return (
    <span className={cn(
      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-onyx',
      status === 'online' ? 'bg-sage' : status === 'away' ? 'bg-amber-400' : 'bg-border-light',
    )} />
  );
}

function MessageBubble({ message, showAvatar }: { message: Message; showAvatar: boolean }) {
  if (message.isOwn) {
    return (
      <div className="flex flex-col items-end gap-1">
        {showAvatar && (
          <span className="text-xs text-text-tertiary mr-1">Вы</span>
        )}
        <div className="flex items-end gap-2 max-w-[70%]">
          <div className="flex items-center gap-1 shrink-0 mb-1">
            <span className="text-[11px] text-text-tertiary whitespace-nowrap">{message.timestamp}</span>
            <MessageStatusIcon status={message.status} />
          </div>
          <div className="bg-champagne/15 border border-champagne/20 rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm text-text-primary leading-relaxed">{message.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 max-w-[70%]">
      <div className="shrink-0 mb-1">
        {showAvatar ? (
          <Avatar name={message.author.name} size="sm" />
        ) : (
          <div className="w-8" />
        )}
      </div>
      <div>
        {showAvatar && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-secondary">{message.author.name}</span>
            <span className="text-[10px] text-text-tertiary">{message.author.role}</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="bg-onyx border border-border-luxury rounded-2xl rounded-tl-sm px-4 py-2.5">
            <p className="text-sm text-text-primary leading-relaxed">{message.text}</p>
          </div>
          <span className="text-[11px] text-text-tertiary whitespace-nowrap mb-1 shrink-0">{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
