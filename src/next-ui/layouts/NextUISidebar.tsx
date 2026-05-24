'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Users, Sparkles, Flower2,
  BarChart3, Settings, MessageCircle, ShoppingBag,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

const ICON_MAP = {
  LayoutDashboard, Calendar, Users, Sparkles, Flower2,
  BarChart3, Settings, MessageCircle, ShoppingBag,
} as Record<string, React.ElementType>;

const NAV_GROUPS = [
  {
    label: 'РАБОЧАЯ ОБЛАСТЬ',
    items: [
      { key: 'nav.dashboard',   href: '/dashboard',   icon: 'LayoutDashboard' },
      { key: 'nav.bookings',    href: '/bookings',     icon: 'Calendar' },
      { key: 'nav.clients',     href: '/clients',      icon: 'Users' },
      { key: 'nav.specialists', href: '/specialists',  icon: 'Sparkles' },
      { key: 'nav.services',    href: '/services',     icon: 'Flower2' },
    ],
  },
  {
    label: 'АНАЛИТИКА',
    items: [
      { key: 'nav.analytics',   href: '/analytics',   icon: 'BarChart3' },
      { key: 'nav.sales',       href: '/sales',        icon: 'ShoppingBag' },
    ],
  },
  {
    label: 'СИСТЕМА',
    items: [
      { key: 'nav.chat',        href: '/chat',         icon: 'MessageCircle' },
      { key: 'nav.settings',    href: '/settings',     icon: 'Settings' },
    ],
  },
];

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function NextUISidebar({ mobileOpen = false, onMobileClose }: Props) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col',
          'bg-onyx border-r border-border-luxury',
          'transition-all duration-300 ease-in-out',
          'lg:relative lg:z-auto lg:translate-x-0',
          collapsed ? 'lg:w-[72px]' : 'lg:w-72',
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72',
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 shrink-0 px-4 border-b border-border-luxury">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 luxury-gradient">
              <span className="font-serif text-sm font-bold text-obsidian tracking-tight">SL</span>
            </div>
            <div className={cn('flex flex-col min-w-0', collapsed && 'lg:hidden')}>
              <span className="font-serif text-sm font-medium text-text-primary leading-tight truncate">
                Shante Lyur
              </span>
              <span className="text-[10px] uppercase tracking-widest text-champagne/60">Next UI</span>
            </div>
          </div>

          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'hidden lg:flex p-1.5 rounded-md shrink-0',
              'text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors',
            )}
            aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation with group labels */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4" aria-label="Основная навигация">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-text-tertiary/60 uppercase">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ key, href, icon }) => {
                  const Icon = ICON_MAP[icon];
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  const label = t(key);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onMobileClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                        'text-sm font-medium transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
                        isActive
                          ? 'bg-champagne/10 text-champagne'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                        collapsed && 'lg:justify-center lg:px-0',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? label : undefined}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            'w-[18px] h-[18px] shrink-0 transition-colors',
                            isActive ? 'text-champagne' : 'text-text-tertiary',
                          )}
                          aria-hidden="true"
                        />
                      )}
                      <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                      {isActive && !collapsed && (
                        <span className="ml-auto w-1.5 h-5 rounded-full bg-champagne shrink-0" aria-hidden="true" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-border-luxury">
          <div
            className={cn(
              'rounded-xl px-3 py-2.5 bg-champagne/5 border border-champagne/10',
              collapsed && 'lg:px-0 lg:flex lg:justify-center',
            )}
          >
            <div className={cn('flex items-center gap-2', collapsed && 'lg:justify-center')}>
              <div className="w-7 h-7 rounded-lg luxury-gradient flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-obsidian">v3</span>
              </div>
              <div className={cn('flex flex-col min-w-0', collapsed && 'lg:hidden')}>
                <span className="text-xs font-medium text-champagne/80 truncate">Next UI</span>
                <span className="text-[10px] text-text-tertiary">Shante Lyur OS</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
