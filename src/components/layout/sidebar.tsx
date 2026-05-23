'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MonitorDot,
  Calendar,
  Users,
  Sparkles,
  Flower2,
  BarChart3,
  ShoppingCart,
  Package,
  Wallet,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/domain/enums';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        label: 'Дашборд',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Операционный центр',
        href: '/operations',
        icon: MonitorDot,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR],
      },
    ],
  },
  {
    label: 'Управление',
    items: [
      {
        label: 'Записи',
        href: '/bookings',
        icon: Calendar,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.SPECIALIST],
      },
      {
        label: 'Клиенты',
        href: '/clients',
        icon: Users,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR],
      },
      {
        label: 'Специалисты',
        href: '/specialists',
        icon: Sparkles,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
      {
        label: 'Услуги',
        href: '/services',
        icon: Flower2,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
    ],
  },
  {
    label: 'Продажи и финансы',
    items: [
      {
        label: 'Продажи',
        href: '/sales',
        icon: ShoppingCart,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR],
      },
      {
        label: 'Склад',
        href: '/inventory',
        icon: Package,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
      {
        label: 'Финансы',
        href: '/finance',
        icon: Wallet,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
    ],
  },
  {
    label: 'Аналитика',
    items: [
      {
        label: 'Аналитика',
        href: '/analytics',
        icon: BarChart3,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
    ],
  },
  {
    items: [
      {
        label: 'Чат',
        href: '/chat',
        icon: MessageSquare,
      },
      {
        label: 'Настройки',
        href: '/settings',
        icon: Settings,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
    ],
  },
];

function isVisible(item: NavItem, role: UserRole | null): boolean {
  if (!item.roles) return true;
  if (!role) return true; // show all when role not yet loaded
  return item.roles.includes(role);
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  userRole?: UserRole | null;
}

export function Sidebar({ mobileOpen = false, onMobileClose, userRole = null }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isVisible(item, userRole)),
  })).filter((group) => group.items.length > 0);

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
            <div
              className={cn(
                'flex items-center justify-center',
                'w-9 h-9 rounded-xl shrink-0',
                'luxury-gradient',
              )}
              aria-hidden="true"
            >
              <span className="font-serif text-sm font-bold text-obsidian tracking-tight">SL</span>
            </div>
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
              collapsed && 'lg:hidden',
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
        <nav className="flex-1 min-h-0 overflow-y-auto p-3" aria-label="Основная навигация">
          <div className="space-y-4">
            {visibleGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                {group.label && !collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map(({ label, href, icon: Icon }) => {
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
                            isActive ? 'text-champagne' : 'text-text-tertiary',
                          )}
                          aria-hidden="true"
                        />
                        <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                        {isActive && !collapsed && (
                          <span
                            className="ml-auto w-1 h-4 rounded-full bg-champagne shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
                <span className="text-xs font-medium text-text-secondary truncate">
                  Shante Lyur OS
                </span>
                <span className="text-[10px] text-text-tertiary">v3.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
