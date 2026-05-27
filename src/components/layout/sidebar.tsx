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
  MessageCircle,
  Radio,
  Inbox,
  ShoppingBag,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Landmark,
  Brain,
  ClipboardList,
  CalendarCheck,
  BadgePercent,
  Coins,
  Shield,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { useChatUnread } from '@/contexts/chatUnread';
import { getClientRole } from '@/lib/client-auth';

interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const FRONT_DESK = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];
const MANAGER_UP = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const ADMIN_ONLY = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']; // ADMIN = MANAGER rights
const SPECIALIST_ONLY = ['COSMETOLOGIST', 'MASSAGIST'];
const EMPLOYEES = [...FRONT_DESK, ...SPECIALIST_ONLY];

const NAV_ITEMS: NavItem[] = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, roles: FRONT_DESK },
  { key: 'nav.operations', href: '/operations', icon: Activity, roles: FRONT_DESK },
  { key: 'nav.receptionist', href: '/receptionist', icon: ClipboardList, roles: FRONT_DESK },
  { key: 'nav.myPanel', href: '/my-panel', icon: CalendarCheck, roles: SPECIALIST_ONLY },
  { key: 'nav.myPortal', href: '/my', icon: UserCircle, roles: EMPLOYEES },
  { key: 'nav.bookings', href: '/bookings', icon: Calendar, roles: FRONT_DESK },
  { key: 'nav.clients', href: '/clients', icon: Users, roles: FRONT_DESK },
  { key: 'nav.specialists', href: '/specialists', icon: Sparkles, roles: FRONT_DESK },
  { key: 'nav.services', href: '/services', icon: Flower2, roles: FRONT_DESK },
  { key: 'nav.analytics', href: '/analytics', icon: BarChart3, roles: FRONT_DESK },
  { key: 'nav.sales', href: '/sales', icon: ShoppingBag, roles: MANAGER_UP },
  { key: 'nav.inventory', href: '/inventory', icon: Package, roles: MANAGER_UP },
  { key: 'nav.finance', href: '/finance', icon: Landmark, roles: ADMIN_ONLY },
  { key: 'nav.payroll', href: '/payroll', icon: Coins, roles: ADMIN_ONLY },
  { key: 'nav.risk', href: '/risk', icon: Shield, roles: ADMIN_ONLY },
  { key: 'nav.promoCodes', href: '/promo-codes', icon: BadgePercent, roles: MANAGER_UP },
  { key: 'nav.executive', href: '/executive', icon: Brain, roles: ADMIN_ONLY },
  { key: 'nav.chat', href: '/chat', icon: MessageCircle, roles: EMPLOYEES },
  { key: 'nav.staffRequests', href: '/staff-requests', icon: Inbox, roles: MANAGER_UP },
  { key: 'nav.communications', href: '/communications', icon: Radio, roles: MANAGER_UP },
  { key: 'nav.permissions', href: '/permissions', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
  { key: 'nav.settings', href: '/settings', icon: Settings, roles: ADMIN_ONLY },
];

function getJwtRole(): string {
  return getClientRole();
}

function useUserRole(): string {
  const [role, setRole] = React.useState('');
  React.useEffect(() => {
    setRole(getJwtRole());
  }, []);
  return role;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = React.useState(false);
  const role = useUserRole();
  const { total: chatUnread } = useChatUnread();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (!!role && item.roles.includes(role)));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        data-sidebar="true"
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col',
          'bg-onyx border-r border-border-luxury',
          'transition-all duration-300 ease-in-out',
          'lg:relative lg:z-auto lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72',
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 shrink-0 px-4 border-b border-border-luxury justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 luxury-gradient"
              aria-hidden="true"
            >
              <span className="font-serif text-sm font-bold text-obsidian tracking-tight">SL</span>
            </div>
            <div className={cn('flex flex-col', collapsed && 'lg:hidden')}>
              <span className="font-serif text-sm font-medium text-text-primary leading-tight">Shante Lyur</span>
              <span className="text-[10px] uppercase tracking-widest text-text-tertiary">Wellness Studio</span>
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
              'hidden lg:flex p-1.5 rounded-md',
              'text-text-tertiary hover:text-text-primary hover:bg-charcoal',
              'transition-colors',
            )}
            aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Основная навигация">
          {visibleItems.map(({ key, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            const label = t(key);
            const showBadge = href === '/chat' && chatUnread > 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl',
                  'text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
                  isActive
                    ? 'bg-champagne/8 text-champagne'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/4',
                  collapsed && 'lg:justify-center lg:px-0',
                )}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-champagne' : 'text-text-tertiary',
                  )}
                  aria-hidden="true"
                />
                {showBadge && collapsed && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
                )}
                <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                {showBadge && !collapsed && (
                  <span className="ml-auto min-w-[1.25rem] h-4 rounded-full bg-red-500 flex items-center justify-center px-0.5 shrink-0">
                    <span className="text-[9px] font-bold text-white leading-none">{chatUnread > 99 ? '99+' : chatUnread}</span>
                  </span>
                )}
                {isActive && !collapsed && !showBadge && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-champagne shrink-0" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-border-luxury">
          <div className={cn('rounded-xl px-3 py-2.5 bg-charcoal border border-border-luxury', collapsed && 'lg:px-0 lg:flex lg:justify-center')}>
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
