'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, LogOut, User, ChevronDown, Sun, Moon, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/language';
import { UIVersionToggle } from '@/next-ui/components/UIVersionToggle';
import { authHeaders as clientAuthHeaders } from '@/lib/client-auth';

interface HeaderProps {
  title: string;
  onMobileMenuOpen?: () => void;
}

function useClock() {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const dropdownContentCls = cn(
  'min-w-52 rounded-xl overflow-hidden',
  'bg-onyx border border-border-luxury shadow-luxury-lg',
  'animate-slide-down origin-top-right',
);

const dropdownItemCls = cn(
  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer',
  'text-text-secondary',
  'hover:text-text-primary hover:bg-charcoal',
  'focus:outline-none focus:bg-charcoal focus:text-text-primary',
  'transition-colors outline-none select-none',
);

function ThemeToggle() {
  const { t } = useLanguage();
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    setIsDark(!document.documentElement.classList.contains('light'));
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    const goLight = html.classList.contains('dark');
    html.classList.toggle('dark', !goLight);
    html.classList.toggle('light', goLight);
    try { localStorage.setItem('theme', goLight ? 'light' : 'dark'); } catch {}
    setIsDark(!goLight);
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        'p-2.5 rounded-xl',
        'text-text-secondary hover:text-text-primary hover:bg-charcoal',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
      )}
      aria-label={isDark ? t('header.theme.light') : t('header.theme.dark')}
    >
      {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
    </button>
  );
}

function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
      className={cn(
        'px-2 py-1.5 rounded-lg text-xs font-semibold tracking-wider',
        'border border-border-luxury',
        'text-text-secondary hover:text-text-primary hover:border-champagne/40',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
      )}
      aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
    >
      {lang === 'ru' ? 'EN' : 'RU'}
    </button>
  );
}

interface OpsNotif {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  appointmentId: string | null;
  data: { conversationId?: string; conversationType?: string } | null;
}

interface ChatConvUnread {
  conversationId: string;
  unreadCount: number;
  lastMessagePreview: string | null;
}

function getAuthHeaders(): Record<string, string> {
  return clientAuthHeaders();
}

function NotificationBell() {
  const { t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<OpsNotif[]>([]);
  const [chatConvs, setChatConvs] = React.useState<ChatConvUnread[]>([]);
  const [chatTotal, setChatTotal] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const fetchNotifs = React.useCallback(() => {
    const headers = getAuthHeaders();
    if (!headers['x-user-id']) return;
    fetch('/api/notifications/operational', { headers })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setNotifications(json.data.notifications as OpsNotif[]);
      })
      .catch(() => {});
  }, []);

  const fetchChatUnread = React.useCallback(() => {
    const headers = getAuthHeaders();
    if (!headers['x-user-id']) return;
    fetch('/api/v1/chat/unread', { headers })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setChatTotal(json.data.total as number);
          setChatConvs(json.data.conversations as ChatConvUnread[]);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetchNotifs();
    fetchChatUnread();
    const headers = getAuthHeaders();
    if (!headers['x-user-id']) return;
    const es = new EventSource('/api/realtime/ops-stream');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type?: string };
        if (ev.type && ev.type !== 'connected') fetchNotifs();
      } catch {}
    };
    const pollId = setInterval(fetchChatUnread, 60_000);
    return () => { es.close(); clearInterval(pollId); };
  }, [fetchNotifs, fetchChatUnread]);

  const opsUnread = notifications.filter((n) => !n.readAt).length;
  const totalUnread = opsUnread + chatTotal;

  const markAllRead = React.useCallback(() => {
    const headers = getAuthHeaders();
    if (!headers['x-user-id']) return;
    fetch('/api/notifications/operational/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}',
    }).catch(() => {});
    setNotifications((ns) => ns.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }, []);

  const relativeTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return t('notif.justNow');
    if (diff < 60) return `${diff} ${t('notif.minsAgo')}`;
    return formatTime(new Date(iso));
  };

  const markOneRead = React.useCallback((id: string) => {
    const headers = getAuthHeaders();
    if (!headers['x-user-id']) return;
    fetch('/api/notifications/operational/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
    setNotifications((ns) => ns.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  }, []);

  const handleNotifClick = React.useCallback((n: OpsNotif) => {
    markOneRead(n.id);
    setOpen(false);
    if (n.appointmentId) {
      router.push(`/bookings?id=${n.appointmentId}`);
    } else if (n.data?.conversationId) {
      router.push(`/chat?conv=${n.data.conversationId}`);
    }
    // STAFF_ALERT without conversationId or system alerts → no navigation, just closes dropdown
  }, [markOneRead, router]);

  const isEmpty = notifications.length === 0 && chatConvs.length === 0;

  return (
    <DropdownMenu.Root open={open} onOpenChange={(v) => { setOpen(v); if (v) { fetchNotifs(); fetchChatUnread(); } }}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'relative p-2.5 rounded-xl',
            'text-text-secondary hover:text-text-primary hover:bg-charcoal',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
          )}
          aria-label={t('header.notifications')}
        >
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[1rem] h-4 rounded-full bg-champagne flex items-center justify-center px-0.5">
              <span className="text-[9px] font-bold text-obsidian leading-none">{totalUnread > 9 ? '9+' : totalUnread}</span>
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(dropdownContentCls, 'w-80')}
          align="end"
          sideOffset={8}
          style={{ zIndex: 200 }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-luxury">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-text-primary">{t('notif.title')}</p>
              {totalUnread > 0 && (
                <span className="text-[10px] font-bold bg-champagne text-obsidian rounded-full px-1.5 py-0.5">{totalUnread}</span>
              )}
            </div>
            {opsUnread > 0 && (
              <button onClick={markAllRead} className="text-xs text-champagne hover:opacity-80 transition-opacity flex items-center gap-1">
                <Check className="w-3 h-3" /> {t('notif.markAll')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isEmpty ? (
              <div className="px-3 py-8 text-center">
                <Bell className="w-8 h-8 text-text-tertiary/40 mx-auto mb-2" />
                <p className="text-sm text-text-tertiary">{t('notif.empty')}</p>
              </div>
            ) : (
              <>
                {chatConvs.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 border-b border-border-luxury/50 bg-charcoal/40">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">{t('notif.messages')}</p>
                    </div>
                    {chatConvs.slice(0, 5).map((c) => (
                      <div
                        key={c.conversationId}
                        onClick={() => { router.push('/chat'); setOpen(false); }}
                        className="px-3 py-2.5 flex items-start gap-2.5 border-b border-border-luxury/30 last:border-0 bg-champagne/5 cursor-pointer hover:bg-champagne/10 transition-colors"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary">
                            {c.unreadCount === 1 ? `1 ${t('notif.newMessage')}` : `${c.unreadCount} ${t('notif.newMessages')}`}
                          </p>
                          {c.lastMessagePreview && (
                            <p className="text-xs text-text-secondary mt-0.5 truncate">{c.lastMessagePreview}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {notifications.length > 0 && (
                  <>
                    {chatConvs.length > 0 && (
                      <div className="px-3 py-1.5 border-b border-border-luxury/50 bg-charcoal/40">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">{t('notif.notifications')}</p>
                      </div>
                    )}
                    <div className="py-1">
                      {notifications.slice(0, 20).map((n) => {
                        const isClickable = !!(n.appointmentId || n.data?.conversationId);
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={cn(
                              'w-full px-3 py-2.5 flex items-start gap-2.5 border-b border-border-luxury/30 last:border-0 text-left transition-colors',
                              !n.readAt && 'bg-champagne/5',
                              isClickable ? 'cursor-pointer hover:bg-charcoal/60' : 'cursor-default',
                            )}
                          >
                            {!n.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-champagne shrink-0" />}
                            {n.readAt && <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-text-primary">{n.title}</p>
                              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.body}</p>
                              <p className="text-[10px] text-text-tertiary mt-1">{relativeTime(n.createdAt)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function UserMenu() {
  const { t } = useLanguage();
  const router = useRouter();
  const [me, setMe] = React.useState<{ firstName: string; lastName: string; email: string; role: string } | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => { if (json.success) setMe(json.data); })
      .catch(() => {});
  }, []);

  const ROLE_LABEL: Record<string, string> = {
    SUPER_ADMIN: t('profile.role.super'),
    ADMIN: t('profile.role.admin'),
    MANAGER: t('profile.role.manager'),
    RECEPTIONIST: t('profile.role.receptionist'),
    COSMETOLOGIST: t('profile.role.cosmetologist'),
    MASSAGIST: t('profile.role.massagist'),
    CLIENT: t('profile.role.client'),
  };

  const fullName = me ? `${me.firstName} ${me.lastName}` : t('header.admin');
  const roleLabel = me ? (ROLE_LABEL[me.role] ?? me.role) : t('header.role');

  const handleLogout = React.useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally {
      window.location.href = '/login';
    }
  }, []);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl',
            'hover:bg-charcoal transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
          )}
          aria-label={t('header.profile')}
        >
          <Avatar name={fullName} size="sm" />
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-text-primary leading-tight">{fullName}</span>
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{roleLabel}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-text-tertiary hidden sm:block" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={dropdownContentCls}
          align="end"
          sideOffset={8}
          style={{ zIndex: 200 }}
        >
          <div className="px-3 py-2.5 border-b border-border-luxury">
            <p className="text-sm font-medium text-text-primary">{fullName}</p>
            <p className="text-xs text-text-tertiary mt-0.5">{me?.email ?? ''}</p>
          </div>

          <div className="p-1">
            <DropdownMenu.Item className={dropdownItemCls} onSelect={() => router.push('/profile')}>
              <User className="w-4 h-4" aria-hidden="true" />
              {t('header.myProfile')}
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-border-luxury" />

            <DropdownMenu.Item
              className={cn(
                dropdownItemCls,
                'text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300',
              )}
              onSelect={handleLogout}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              {t('header.logout')}
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Header({ title, onMobileMenuOpen }: HeaderProps) {
  const now = useClock();
  const { t, lang } = useLanguage();

  return (
    <header
      className={cn(
        'h-16 shrink-0 flex items-center justify-between px-4 lg:px-6',
        'bg-onyx/80 backdrop-blur-md border-b border-border-luxury',
        'sticky top-0 z-30',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className={cn(
            'lg:hidden p-2 rounded-lg',
            'text-text-secondary hover:text-text-primary hover:bg-charcoal',
            'transition-colors',
          )}
          aria-label={t('header.openMenu')}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {now && (
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs text-text-secondary">{formatDate(now, lang === 'en' ? 'en-US' : 'ru-RU')}</span>
            <span className="text-[10px] text-text-tertiary">{formatTime(now)}</span>
          </div>
        )}
        <UIVersionToggle compact />
        <div className="w-px h-6 bg-border-luxury mx-1 hidden sm:block" aria-hidden="true" />
        <LanguageToggle />
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border-luxury mx-1 hidden sm:block" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}
