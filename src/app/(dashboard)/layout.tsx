'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { LanguageProvider, useLanguage } from '@/contexts/language';
import { UIVersionProvider, useUIVersion } from '@/contexts/ui-version';
import { NextUIShell } from '@/next-ui/layouts/NextUIShell';
import { cn } from '@/lib/utils';

const PAGE_KEYS: Record<string, string> = {
  '/dashboard': 'page.dashboard',
  '/operations': 'nav.operations',
  '/receptionist': 'rec.title',
  '/my-panel': 'panel.title',
  '/bookings': 'page.bookings',
  '/clients': 'page.clients',
  '/specialists': 'page.specialists',
  '/services': 'page.services',
  '/analytics': 'page.analytics',
  '/sales': 'page.sales',
  '/finance': 'nav.finance',
  '/executive': 'nav.executive',
  '/chat': 'nav.chat',
  '/settings': 'page.settings',
  '/profile': 'page.profile',
};

function getKey(pathname: string): string {
  for (const [route, key] of Object.entries(PAGE_KEYS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return key;
  }
  return 'Shante Lyur';
}

function LegacyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const key = getKey(pathname);
  const title = t(key) || key;

  return (
    <div className="flex h-screen bg-obsidian overflow-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
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

function ShellRouter({ children }: { children: React.ReactNode }) {
  const { version, density } = useUIVersion();
  const [visible, setVisible] = React.useState(true);
  const prevVersion = React.useRef(version);

  // Initialise desktop notifications once per session (SW register + permission prompt)
  React.useEffect(() => {
    import('@/lib/desktopNotifications').then(({ initDesktopNotifications }) => {
      initDesktopNotifications();
    });
  }, []);

  // Fade out → swap shell → fade in on version change
  React.useEffect(() => {
    if (prevVersion.current === version) return;
    setVisible(false);
    const t = setTimeout(() => {
      prevVersion.current = version;
      setVisible(true);
    }, 120);
    return () => clearTimeout(t);
  }, [version]);

  const shell = version === 'next'
    ? <NextUIShell density={density}>{children}</NextUIShell>
    : <LegacyShell>{children}</LegacyShell>;

  return (
    <div
      className={cn('transition-opacity duration-150', !visible && 'opacity-0')}
      data-density={density}
      data-ui={version}
    >
      {shell}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <UIVersionProvider>
        <ShellRouter>{children}</ShellRouter>
      </UIVersionProvider>
    </LanguageProvider>
  );
}
