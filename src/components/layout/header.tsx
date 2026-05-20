'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, LogOut, User, ChevronDown, Sun, Moon } from 'lucide-react';
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

const mockNotifications = [
  { id: '1', title: 'Новая запись', body: 'Анна Соколова записалась на 09:00', time: '5 мин назад', unread: true },
  { id: '2', title: 'Подтверждение', body: 'Елена Морозова подтвердила визит', time: '15 мин назад', unread: true },
  { id: '3', title: 'Платёж получен', body: '12 000 ₽ от Светлана Ким', time: '45 мин назад', unread: true },
  { id: '4', title: 'Отмена записи', body: 'Ольга Новикова отменила запись', time: '2 ч назад', unread: false },
  { id: '5', title: 'Новый отзыв', body: '5★ от Татьяна Лебедева', time: '3 ч назад', unread: false },
  { id: '6', title: 'Напоминание', body: 'Завтра — 8 записей', time: 'Вчера', unread: false },
  { id: '7', title: 'Обновление системы', body: 'Версия 3.0.0 установлена', time: '2 дня назад', unread: false },
];

function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const unread = mockNotifications.filter((n) => n.unread).length;

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
          {unread > 0 && (
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-champagne"
              aria-label={`${unread} новых уведомлений`}
            />
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
          <div className="px-4 py-3 border-b border-border-luxury flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">Уведомления</p>
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{unread} новых</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border-luxury">
            {mockNotifications.slice(0, 10).map((n) => (
              <DropdownMenu.Item
                key={n.id}
                onSelect={(e) => {
                  e.preventDefault();
                  toast(n.body);
                }}
                className={cn(
                  'flex flex-col gap-0.5 px-4 py-3 cursor-pointer',
                  'focus:outline-none focus:bg-charcoal',
                  n.unread && 'bg-champagne/[0.03]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-text-primary">{n.title}</p>
                  <span className="text-[10px] text-text-tertiary shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2">{n.body}</p>
              </DropdownMenu.Item>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-border-luxury">
            <button
              onClick={() => { toast('Все уведомления прочитаны'); setOpen(false); }}
              className="text-xs text-champagne hover:text-champagne-light transition-colors"
            >
              Отметить все прочитанными
            </button>
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
