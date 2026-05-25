'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, LogOut, User, ChevronDown, Sun, Moon, CheckCheck } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { useLang } from '@/lib/i18n-context';

interface HeaderProps {
  title: string;
  onMobileMenuOpen?: () => void;
}

function useClock() {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return now;
}

interface ApiNotification {
  id:        string;
  type:      string;
  status:    string;
  title:     string;
  body:      string;
  createdAt: string;
  readAt:    string | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'только что';
  if (m < 60)  return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'вчера';
  return `${d} дн назад`;
}

function NotificationBell() {
  const router = useRouter();
  const [open, setOpen]           = React.useState(false);
  const [items, setItems]         = React.useState<ApiNotification[]>([]);
  const [unreadCount, setUnread]  = React.useState(0);
  const [marking, setMarking]     = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res  = await fetch('/api/v1/notifications?limit=10');
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items as ApiNotification[]);
        setUnread(json.data.unreadCount as number);
      }
    } catch { /* non-fatal */ }
  }, []);

  // Load on mount and when dropdown opens
  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { if (open) void load(); }, [open, load]);

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch('/api/v1/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
      setUnread(0);
    } catch { /* non-fatal */ } finally {
      setMarking(false);
    }
  }

  const isUnread = (n: ApiNotification) => !['READ', 'FAILED'].includes(n.status);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'relative p-2.5 rounded-xl',
            'text-text-secondary hover:text-text-primary hover:bg-charcoal',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
          )}
          aria-label="Уведомления"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-champagne text-obsidian text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 w-80 max-h-[28rem] overflow-hidden flex flex-col rounded-xl',
            'bg-onyx border border-border-luxury shadow-luxury-lg',
            'animate-slide-down origin-top-right',
          )}
          align="end"
          sideOffset={8}
        >
          <div className="px-4 py-3 border-b border-border-luxury flex items-center justify-between shrink-0">
            <p className="text-sm font-medium text-text-primary">Уведомления</p>
            {unreadCount > 0 && (
              <span className="text-[10px] text-champagne font-medium">{unreadCount} новых</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border-luxury">
            {items.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-text-muted">
                Нет уведомлений
              </div>
            )}
            {items.map((n) => (
              <DropdownMenu.Item
                key={n.id}
                onSelect={(e) => {
                  e.preventDefault();
                  if (isUnread(n)) {
                    void fetch(`/api/v1/notifications/${n.id}/read`, { method: 'PATCH' })
                      .then(() => {
                        setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, status: 'READ' } : x));
                        setUnread((c) => Math.max(0, c - 1));
                      });
                  }
                }}
                className={cn(
                  'flex flex-col gap-0.5 px-4 py-3 cursor-pointer outline-none',
                  'hover:bg-charcoal focus:bg-charcoal transition-colors',
                  isUnread(n) && 'bg-champagne/[0.03]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-text-primary leading-snug">{n.title}</p>
                  <span className="text-[10px] text-text-tertiary shrink-0 mt-0.5">{relativeTime(n.createdAt)}</span>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2">{n.body}</p>
                {isUnread(n) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-champagne absolute left-2 top-1/2 -translate-y-1/2" />
                )}
              </DropdownMenu.Item>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-border-luxury flex items-center justify-between shrink-0">
            <button
              onClick={() => { setOpen(false); router.push('/notifications'); }}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Все уведомления →
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="flex items-center gap-1 text-xs text-champagne hover:text-champagne/80 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3 h-3" />
                Прочитать все
              </button>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ThemeToggle() {
  const [dark, setDark] = React.useState(true);

  React.useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored ? stored === 'dark' : true;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.classList.toggle('light', !next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'p-2.5 rounded-xl',
        'text-text-secondary hover:text-text-primary hover:bg-charcoal',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
      )}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
      className={cn(
        'px-2 py-1.5 rounded-xl text-xs font-medium',
        'text-text-secondary hover:text-text-primary hover:bg-charcoal',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
      )}
      aria-label="Switch language"
    >
      {lang === 'ru' ? 'RU' : 'EN'}
    </button>
  );
}

function UserMenu() {
  const router = useRouter();
  const handleLogout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Вы вышли из системы');
    } finally {
      window.location.href = '/login';
    }
  }, []);
  const handleProfile = React.useCallback(() => {
    router.push('/settings');
  }, [router]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl',
            'hover:bg-charcoal transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
          )}
          aria-label="Меню пользователя"
        >
          <Avatar name="Admin User" size="sm" />
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-text-primary leading-tight">Администратор</span>
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">admin</span>
          </div>
          <ChevronDown className="w-4 h-4 text-text-tertiary hidden sm:block" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 min-w-48 rounded-xl overflow-hidden',
            'bg-onyx border border-border-luxury shadow-luxury-lg',
            'animate-slide-down origin-top-right',
          )}
          align="end"
          sideOffset={8}
        >
          <div className="px-3 py-2.5 border-b border-border-luxury">
            <p className="text-sm font-medium text-text-primary">Администратор</p>
            <p className="text-xs text-text-tertiary mt-0.5">admin@shantelyur.ru</p>
          </div>

          <div className="p-1">
            <DropdownMenu.Item
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
                'text-text-secondary cursor-pointer',
                'hover:text-text-primary hover:bg-charcoal',
                'focus:outline-none focus:bg-charcoal focus:text-text-primary',
                'transition-colors',
              )}
              onSelect={handleProfile}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              Профиль
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-border-luxury" />

            <DropdownMenu.Item
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
                'text-red-400 cursor-pointer',
                'hover:text-red-300 hover:bg-red-500/10',
                'focus:outline-none focus:bg-red-500/10 focus:text-red-300',
                'transition-colors',
              )}
              onSelect={handleLogout}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Выйти
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Header({ title, onMobileMenuOpen }: HeaderProps) {
  const now = useClock();

  return (
    <header
      className={cn(
        'h-16 shrink-0 flex items-center justify-between px-4 lg:px-6',
        'bg-onyx/80 backdrop-blur-md border-b border-border-luxury',
        'sticky top-0 z-30',
      )}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onMobileMenuOpen}
          className={cn(
            'lg:hidden p-2 rounded-lg',
            'text-text-secondary hover:text-text-primary hover:bg-charcoal',
            'transition-colors',
          )}
          aria-label="Открыть меню"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Date/time display */}
        {now && (
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs text-text-secondary">{formatDate(now)}</span>
            <span className="text-[10px] text-text-tertiary">{formatTime(now)}</span>
          </div>
        )}

        <LangToggle />
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border-luxury mx-1 hidden sm:block" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}
