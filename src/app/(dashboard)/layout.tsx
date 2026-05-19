'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { useLang } from '@/context/lang-context';
import { ROLE_BLOCKED_PAGES, blockedRedirect } from '@/lib/permissions';
import { ErrorBoundary } from '@/components/error-boundary';

// Inner layout — rendered only after auth context is ready
function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const { t } = useLang();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Client-side role guard — mirrors middleware but catches hydration edge cases
  React.useEffect(() => {
    if (isLoading || !user) return;
    const blocked = ROLE_BLOCKED_PAGES[user.role];
    if (!blocked) return;
    const isBlocked = blocked.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (isBlocked) router.replace(blockedRedirect(user.role));
  }, [pathname, user, isLoading, router]);

  const PAGE_TITLE_KEYS: Record<string, string> = {
    '/dashboard':   'dashboard',
    '/bookings':    'bookings',
    '/clients':     'clients',
    '/specialists': 'specialists',
    '/services':    'services',
    '/analytics':   'analytics',
    '/settings':    'settings',
    '/schedule':    'schedule',
    '/chat':        'chat',
  };

  function getTitle(p: string): string {
    for (const [route, key] of Object.entries(PAGE_TITLE_KEYS)) {
      if (p === route || p.startsWith(`${route}/`)) return t.nav[key] ?? 'Shante Lyur';
    }
    return 'Shante Lyur';
  }

  const title = getTitle(pathname);

  // Show a minimal loading screen while session is being verified.
  // The middleware redirect handles the unauthenticated case server-side;
  // this loading state covers the brief client-side hydration window.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-obsidian">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl luxury-gradient flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="font-serif text-sm font-bold text-obsidian">SL</span>
          </div>
          <div className="w-5 h-5 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      </div>
    );
  }

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
          <ErrorBoundary name="page">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardInner>{children}</DashboardInner>
    </AuthProvider>
  );
}
