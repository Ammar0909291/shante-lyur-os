'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Дашборд',
  '/bookings': 'Записи',
  '/clients': 'Клиенты',
  '/specialists': 'Специалисты',
  '/services': 'Услуги',
  '/analytics': 'Аналитика',
  '/settings': 'Настройки',
};

function getTitle(pathname: string): string {
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return title;
  }
  return 'Shante Lyur';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const title = getTitle(pathname);

  return (
    <div className="flex h-screen bg-[#F4F6FB] overflow-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
