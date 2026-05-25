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
  FileText,
  Bell,
  MessageSquare,
  ClockIcon,
  Award,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n-context';

interface NavItem {
  labelKey: Parameters<ReturnType<typeof useT>>[0];
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.bookings', href: '/bookings', icon: Calendar },
  { labelKey: 'nav.clients', href: '/clients', icon: Users },
  { labelKey: 'nav.specialists', href: '/specialists', icon: Sparkles },
  { labelKey: 'nav.services', href: '/services', icon: Flower2 },
  { labelKey: 'nav.analytics', href: '/analytics', icon: BarChart3 },
  { labelKey: 'nav.sales',    href: '/sales',    icon: BarChart3  },
  { labelKey: 'nav.reports',        href: '/reports',        icon: FileText },
  { labelKey: 'nav.notifications',  href: '/notifications',  icon: Bell     },
  { labelKey: 'nav.communication',  href: '/communication',  icon: MessageSquare },
  { labelKey: 'nav.waitlist',       href: '/waitlist',       icon: ClockIcon     },
  { labelKey: 'nav.loyalty',        href: '/loyalty',        icon: Award         },
  { labelKey: 'nav.settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const t = useT();

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
          'bg-onyx border-r border-border-luxury',
          'transition-all duration-300 ease-in-out',
          // Desktop
          'lg:relative lg:z-auto lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72',
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            'flex items-center h-16 shrink-0 px-4 border-b border-border-luxury',
            collapsed ? 'lg:justify-center' : 'justify-between',
          )}
        >
          <div className={cn('flex items-center gap-3', collapsed && 'lg:justify-center')}>
            {/* Monogram */}
            <div
              className={cn(
                'flex items-center justify-center',
                'w-9 h-9 rounded-xl shrink-0',
                'luxury-gradient',
              )}
              aria-hidden="true"
            >
              <span className="font-serif text-sm font-bold text-obsidian tracking-tight">
                SL
              </span>
            </div>
            {/* Brand name */}
            <div className={cn('flex flex-col', collapsed && 'lg:hidden')}>
              <span className="font-serif text-sm font-medium text-text-primary leading-tight">
                Shante Lyur
              </span>
              <span className="text-[10px] uppercase tracking-widest text-text-tertiary">
                Wellness Studio
              </span>
            </div>
          </div>

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'hidden lg:flex p-1.5 rounded-md',
              'text-text-tertiary hover:text-text-primary hover:bg-charcoal',
              'transition-colors',
            )}
            aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Основная навигация">
          {navItems.map(({ labelKey, href, icon: Icon }) => {
            const label = t(labelKey);
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
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
                    ? 'bg-champagne/8 text-champagne shadow-champagne-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/4',
                  collapsed && 'lg:justify-center lg:px-0',
                )}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-champagne' : 'text-text-tertiary group-hover:text-text-primary',
                  )}
                  aria-hidden="true"
                />
                <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                {isActive && !collapsed && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-champagne shrink-0" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 p-3 border-t border-border-luxury">
          <div
            className={cn(
              'rounded-xl px-3 py-2.5 bg-charcoal border border-border-luxury',
              collapsed && 'lg:px-0 lg:flex lg:justify-center',
            )}
          >
            <div className={cn('flex items-center gap-3', collapsed && 'lg:justify-center')}>
              <div className="w-7 h-7 rounded-lg luxury-gradient flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-obsidian">v3</span>
              </div>
              <div className={cn('flex flex-col min-w-0', collapsed && 'lg:hidden')}>
                <span className="text-xs font-medium text-text-secondary truncate">Shante Lyur OS</span>
                <span className="text-[10px] text-text-tertiary">v3.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
