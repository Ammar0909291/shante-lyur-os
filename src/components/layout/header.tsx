'use client';

import * as React from 'react';
import { Bell, Menu, LogOut, User, ChevronDown, Sun, Moon } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

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

function ThemeToggle() {
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
      aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
    >
      {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
    </button>
  );
}

function NotificationBell() {
  const [hasNew] = React.useState(true);
  return (
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
      {hasNew && (
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-champagne"
          aria-label="Есть новые уведомления"
        />
      )}
    </button>
  );
}

function UserMenu() {
  const handleLogout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
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

        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border-luxury mx-1 hidden sm:block" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}
