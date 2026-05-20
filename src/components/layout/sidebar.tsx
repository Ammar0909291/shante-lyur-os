'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Flower2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  labelRu?: string;
  'data-i18n'?: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  label: string;
  'data-i18n': string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Основное',
    'data-i18n': 'nav.main',
    items: [
      { label: 'Дашборд',      'data-i18n': 'nav.dashboard',    href: '/dashboard',   icon: LayoutDashboard },
      { label: 'Записи',       'data-i18n': 'nav.schedule',     href: '/bookings',    icon: Calendar,       badge: '12' },
      { label: 'Клиенты',      'data-i18n': 'nav.clients',      href: '/clients',     icon: Users,          badge: '284' },
      { label: 'Специалисты',  'data-i18n': 'nav.specialists',  href: '/specialists', icon: Sparkles },
      { label: 'Услуги',       'data-i18n': 'nav.services',     href: '/services',    icon: Flower2 },
    ],
  },
  {
    label: 'Аналитика',
    'data-i18n': 'nav.analytics_label',
    items: [
      { label: 'Аналитика', 'data-i18n': 'nav.analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Коммуникации',
    'data-i18n': 'nav.communication_label',
    items: [
      { label: 'Внутренний чат', 'data-i18n': 'nav.chat', href: '/chat', icon: MessageSquare, badge: '3' },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col',
          'bg-[#151C2C] border-r border-[#2B3554]',
          'transition-all duration-300 ease-in-out',
          // Desktop
          'lg:relative lg:z-auto lg:translate-x-0',
          collapsed ? 'lg:w-[42px]' : 'lg:w-60',
          // Mobile
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center h-16 shrink-0 px-3 border-b border-[#2B3554]',
            collapsed ? 'lg:justify-center' : 'justify-between',
          )}
        >
          <div className={cn('flex items-center gap-2.5', collapsed && 'lg:justify-center')}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[#7C5CFC]"
              aria-hidden="true"
            >
              {/* Scissors / beauty mark */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M6 2C3.8 2 2 3.8 2 6s1.8 4 4 4c.9 0 1.7-.3 2.4-.8L12 12l-3.6 2.8c-.7-.5-1.5-.8-2.4-.8-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4c0-.5-.1-1-.3-1.5L12 14.5l5.3 5.3c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4L7 6.7c.1-.2.2-.5.2-.7C7.2 4.9 6.7 2 6 2zm0 2c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm0 12c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zM17 2l-4.6 4.6 2 2L22 3l-5 1z"/>
              </svg>
            </div>
            <div className={cn('flex flex-col leading-tight', collapsed && 'lg:hidden')}>
              <span className="text-[13px] font-bold text-white tracking-tight">
                Shante Lyur OS
              </span>
              <span
                className="text-[9.5px] uppercase tracking-widest text-[#4a5882]"
                data-i18n="sidebar.tagline"
              >
                Salon &amp; Spa CRM
              </span>
            </div>
          </div>

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-[#4a5882] hover:text-[#8896b8] hover:bg-[#1E2740] transition-colors"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse toggle */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-md text-[#4a5882] hover:text-[#8896b8] hover:bg-[#1E2740] transition-colors"
              aria-label="Свернуть"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" aria-label="Основная навигация">
          {collapsed ? (
            /* Icon-only collapsed view */
            <div className="flex flex-col items-center gap-1 px-1 py-1">
              <button
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-lg text-[#4a5882] hover:text-[#8896b8] hover:bg-[#1E2740] transition-colors"
                aria-label="Развернуть"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {navSections.flatMap((s) => s.items).map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-[#7C5CFC] text-white'
                        : 'text-[#8896b8] hover:bg-[#1E2740] hover:text-[#c6d0e8]',
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Full expanded view with section labels */
            navSections.map((section) => (
              <div key={section.label} className="mb-1">
                <p
                  className="px-4 pt-3 pb-1 text-[9.5px] font-semibold uppercase tracking-[.9px] text-[#4a5882] whitespace-nowrap overflow-hidden"
                  data-i18n={section['data-i18n']}
                >
                  {section.label}
                </p>
                {section.items.map(({ label, href, icon: Icon, badge, 'data-i18n': i18n }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onMobileClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/50',
                        isActive
                          ? 'bg-[#7C5CFC] text-white'
                          : 'text-[#8896b8] hover:bg-[#1E2740] hover:text-[#c6d0e8]',
                      )}
                      data-i18n={i18n}
                    >
                      <Icon
                        className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-[#8896b8]')}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {badge && (
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                            isActive
                              ? 'bg-white/25 text-white'
                              : 'bg-[#2B3554] text-[#8896b8]',
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        {/* Bottom: settings + user profile */}
        <div className="shrink-0 border-t border-[#2B3554] py-2">
          {!collapsed && (
            <Link
              href="/settings"
              onClick={onMobileClose}
              aria-current={pathname === '/settings' ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                pathname === '/settings'
                  ? 'bg-[#7C5CFC] text-white'
                  : 'text-[#8896b8] hover:bg-[#1E2740] hover:text-[#c6d0e8]',
              )}
              data-i18n="nav.settings"
            >
              <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Настройки</span>
            </Link>
          )}

          <div
            className={cn(
              'flex items-center gap-2.5 mx-2 mt-1 px-3 py-2 rounded-lg cursor-pointer',
              'hover:bg-[#1E2740] transition-colors',
              collapsed && 'lg:justify-center lg:px-1',
            )}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-gradient-to-br from-[#7C5CFC] to-[#a78bfa]"
              aria-hidden="true"
            >
              SL
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-[#c6d0e8] truncate">
                  Shante Lyur
                </span>
                <span className="text-[10px] text-[#4a5882]" data-i18n="user.role">
                  Администратор
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
