'use client';

import * as React from 'react';
import { Bell, Menu, LogOut, User, ChevronDown, Search, SlidersHorizontal, Plus } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

interface HeaderProps {
  title: string;
  onMobileMenuOpen?: () => void;
}

function NotificationBell() {
  const [hasNew] = React.useState(true);
  return (
    <button
      className={cn(
        'relative p-2 rounded-lg',
        'text-[#6b7a99] hover:text-[#1a2035] hover:bg-[#F4F6FB]',
        'border border-[#e8eaf0] bg-white',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/40',
      )}
      aria-label="Уведомления"
    >
      <Bell className="w-4 h-4" />
      {hasNew && (
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#7C5CFC]"
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
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg',
            'border border-[#e8eaf0] bg-white',
            'hover:bg-[#F4F6FB] transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/40',
          )}
          aria-label="Меню пользователя"
        >
          <Avatar name="Admin User" size="sm" />
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-[12.5px] font-semibold text-[#1a2035] leading-tight">
              Администратор
            </span>
            <span className="text-[10px] text-[#6b7a99] uppercase tracking-wider">admin</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#6b7a99] hidden sm:block" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 min-w-48 rounded-xl overflow-hidden',
            'bg-white border border-[#e8eaf0] shadow-lg',
          )}
          align="end"
          sideOffset={8}
        >
          <div className="px-3 py-2.5 border-b border-[#e8eaf0]">
            <p className="text-[13px] font-semibold text-[#1a2035]">Администратор</p>
            <p className="text-[11px] text-[#6b7a99] mt-0.5">admin@shantelyur.ru</p>
          </div>

          <div className="p-1">
            <DropdownMenu.Item
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]',
                'text-[#6b7a99] cursor-pointer',
                'hover:text-[#1a2035] hover:bg-[#F4F6FB]',
                'focus:outline-none focus:bg-[#F4F6FB] focus:text-[#1a2035]',
                'transition-colors',
              )}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              Профиль
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-[#e8eaf0]" />

            <DropdownMenu.Item
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]',
                'text-red-500 cursor-pointer',
                'hover:text-red-600 hover:bg-red-50',
                'focus:outline-none focus:bg-red-50 focus:text-red-600',
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
  return (
    <header
      className={cn(
        'h-16 shrink-0 flex items-center justify-between px-4 lg:px-5 gap-3',
        'bg-white border-b border-[#e8eaf0]',
        'sticky top-0 z-30',
      )}
    >
      {/* Left: mobile toggle + page title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onMobileMenuOpen}
          className={cn(
            'lg:hidden p-2 rounded-lg',
            'text-[#6b7a99] hover:text-[#1a2035] hover:bg-[#F4F6FB]',
            'transition-colors',
          )}
          aria-label="Открыть меню"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-[17px] font-bold text-[#1a2035] tracking-tight truncate">
          {title}
        </h1>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search bar */}
        <div className="hidden md:flex items-center gap-2 bg-[#F4F6FB] border border-[#e8eaf0] rounded-lg px-3 h-9 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#6b7a99] shrink-0" aria-hidden="true" />
          <input
            type="text"
            placeholder="Поиск клиентов, услуг…"
            data-i18n-placeholder="topbar.search"
            className="bg-transparent border-none outline-none text-[13px] text-[#1a2035] placeholder-[#6b7a99] w-full"
            aria-label="Поиск"
          />
        </div>

        {/* Filter button */}
        <button
          className={cn(
            'p-2 rounded-lg border border-[#e8eaf0] bg-white',
            'text-[#6b7a99] hover:text-[#1a2035] hover:bg-[#F4F6FB]',
            'transition-colors',
          )}
          aria-label="Фильтр"
          title="Фильтр"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <NotificationBell />

        {/* New booking CTA */}
        <button
          className={cn(
            'flex items-center gap-1.5 px-3.5 h-9 rounded-lg',
            'bg-[#7C5CFC] text-white text-[13px] font-semibold',
            'hover:bg-[#5b3ee0] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/50',
          )}
          data-i18n="topbar.newBooking"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Новая запись</span>
        </button>

        <div className="w-px h-6 bg-[#e8eaf0] hidden sm:block" aria-hidden="true" />

        <UserMenu />
      </div>
    </header>
  );
}
