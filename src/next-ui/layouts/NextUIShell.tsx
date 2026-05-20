'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { NextUISidebar } from './NextUISidebar';
import { NextUIHeader } from './NextUIHeader';
import { useLanguage } from '@/contexts/language';
import type { UIDensity } from '@/contexts/ui-version';

const PAGE_KEYS: Record<string, string> = {
  '/dashboard':   'page.dashboard',
  '/bookings':    'page.bookings',
  '/clients':     'page.clients',
  '/specialists': 'page.specialists',
  '/services':    'page.services',
  '/analytics':   'page.analytics',
  '/sales':       'page.sales',
  '/chat':        'nav.chat',
  '/settings':    'page.settings',
  '/profile':     'page.profile',
};

function getKey(pathname: string): string {
  for (const [route, key] of Object.entries(PAGE_KEYS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return key;
  }
  return 'Shante Lyur';
}

interface Props {
  children: React.ReactNode;
  density?: UIDensity;
}

export function NextUIShell({ children, density = 'comfortable' }: Props) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const key = getKey(pathname);
  const title = (key.startsWith('page.') || key.startsWith('nav.')) ? t(key) : key;

  return (
    <div className="flex h-screen bg-obsidian overflow-hidden" data-density={density}>
      <NextUISidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <NextUIHeader
          title={title}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
