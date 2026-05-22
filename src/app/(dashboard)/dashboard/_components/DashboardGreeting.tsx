'use client';

import * as React from 'react';
import Link from 'next/link';
import { Clock, UserPlus, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/language';

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'dashboard.greeting.night';
  if (h < 12) return 'dashboard.greeting.morning';
  if (h < 17) return 'dashboard.greeting.afternoon';
  if (h < 22) return 'dashboard.greeting.evening';
  return 'dashboard.greeting.night';
}

export function DashboardGreeting() {
  const { t } = useLanguage();
  const [firstName, setFirstName] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: { firstName?: string } }) => {
        if (j.success && j.data?.firstName) setFirstName(j.data.firstName);
      })
      .catch(() => {});
  }, []);

  const greeting = t(getGreetingKey());
  const display = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
          {display}
        </h2>
        <p className="text-text-secondary mt-1 text-sm">
          {t('dashboard.subtitle')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-charcoal text-text-primary border border-border-luxury hover:border-border-light hover:bg-charcoal/80 transition-all"
        >
          <Clock className="w-4 h-4" />
          {t('dashboard.schedule')}
        </Link>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-charcoal text-text-primary border border-border-luxury hover:border-border-light hover:bg-charcoal/80 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          {t('dashboard.clients')}
        </Link>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('dashboard.newBooking')}
        </Link>
      </div>
    </div>
  );
}
