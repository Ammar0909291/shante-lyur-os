'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { LangProvider, useT } from '@/lib/i18n-context';

const pageKeys: Record<string, Parameters<ReturnType<typeof useT>>[0]> = {
  '/dashboard': 'page.dashboard',
  '/bookings': 'page.bookings',
  '/clients': 'page.clients',
  '/specialists': 'page.specialists',
  '/services': 'page.services',
  '/analytics': 'page.analytics',
  '/settings': 'page.settings',
};

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const t = useT();

  function getTitle(path: string): string {
    for (const [route, key] of Object.entries(pageKeys)) {
      if (path === route || path.startsWith(`${route}/`)) return t(key);
    }
    return 'Shante Lyur';
  }

  const title = getTitle(pathname);

  return (
    <div className="flex h-screen bg-obsidian overflow-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title={title}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </LangProvider>
  );
}
