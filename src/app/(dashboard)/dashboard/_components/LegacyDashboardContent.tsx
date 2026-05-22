'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, TrendingUp, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { DashboardAnalytics } from './DashboardAnalytics';
import { DashboardGreeting } from './DashboardGreeting';
import type { DashboardSummary } from '@/types/analytics';

export function LegacyDashboardContent({ summary }: { summary: DashboardSummary }) {
  const { t } = useLanguage();
  const { bookings, revenue, specialists } = summary;

  const todayText = bookings.today.total > 0
    ? t('dashboard.todayStats')
        .replace('{total}', String(bookings.today.total))
        .replace('{completed}', String(bookings.today.completed))
        .replace('{upcoming}', String(bookings.today.upcoming))
    : t('dashboard.noAppointments');

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header with greeting + user name + i18n buttons */}
      <DashboardGreeting />

      {/* KPI analytics */}
      <DashboardAnalytics summary={summary} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Link href="/bookings" className="block hover:scale-[1.01] transition-transform">
          <StatCard
            title={t('dashboard.statCards.bookings')}
            value={bookings.today.total}
            subtitle={t('dashboard.statCards.bookingsSub').replace('{n}', String(bookings.today.upcoming))}
            icon={<Calendar className="w-5 h-5" />}
          />
        </Link>
        <Link href="/analytics" className="block hover:scale-[1.01] transition-transform">
          <StatCard
            title={t('dashboard.statCards.revenue')}
            value={formatCurrency(revenue.thisWeek.total)}
            subtitle={t('dashboard.statCards.revenueSub')}
            trend={
              revenue.trend.vsLastWeek !== 0
                ? {
                    value: Math.abs(revenue.trend.vsLastWeek),
                    positive: revenue.trend.vsLastWeek >= 0,
                    label: t('dashboard.statCards.revenueTrend'),
                  }
                : undefined
            }
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </Link>
        <Link
          href="/specialists"
          className="block hover:scale-[1.01] transition-transform sm:col-span-2 xl:col-span-1"
        >
          <StatCard
            title={t('dashboard.statCards.specialists')}
            value={specialists.active}
            subtitle={t('dashboard.statCards.specialistsSub').replace('{n}', String(specialists.workingToday))}
            icon={<Users className="w-5 h-5" />}
          />
        </Link>
      </div>

      {/* Today's schedule link */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">{t('dashboard.todaySchedule')}</h3>
          <Link href="/bookings" className="text-xs text-champagne hover:text-champagne-light transition-colors">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Calendar className="w-10 h-10 text-text-tertiary" />
          <p className="text-text-secondary text-sm">{todayText}</p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all"
          >
            <Calendar className="w-4 h-4" />
            {t('dashboard.openSchedule')}
          </Link>
        </div>
      </div>
    </div>
  );
}
