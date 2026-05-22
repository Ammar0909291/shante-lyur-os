export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Calendar,
  TrendingUp,
  Users,
  Plus,
  UserPlus,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import { UIPageWrapper } from '@/next-ui/components/UIPageWrapper';
import { NextDashboard } from '@/next-ui/dashboard/NextDashboard';
import { DashboardAnalytics } from './_components/DashboardAnalytics';
import type { DashboardSummary } from '@/types/analytics';

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getSummary(): Promise<DashboardSummary | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/analytics/dashboard/summary`, {
      cache: 'no-store',
      headers: token ? { Cookie: `access_token=${token}` } : {},
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: DashboardSummary };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

const EMPTY_SUMMARY: DashboardSummary = {
  bookings: {
    today: { total: 0, completed: 0, upcoming: 0, cancelled: 0, byType: { cosmetology: 0, massage: 0 } },
    trend: { vsYesterday: 0, vsLastWeek: 0 },
  },
  specialists: {
    total: 0,
    active: 0,
    byType: { cosmetology: 0, massage: 0 },
    workingToday: 0,
    massageWorkload: { meetingTarget: 0, belowTarget: 0, overridden: 0 },
  },
  revenue: {
    thisWeek: { total: 0, byType: { cosmetology: 0, massage: 0 } },
    trend: { vsLastWeek: 0, vsLastMonth: 0 },
    today: 0,
  },
  generatedAt: new Date().toISOString(),
};

// ─── Legacy view ──────────────────────────────────────────────────────────────

function LegacyDashboardContent({
  summary,
  greeting,
}: {
  summary: DashboardSummary;
  greeting: string;
}) {
  const { bookings, revenue, specialists } = summary;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {greeting}
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Вот что происходит в вашей студии сегодня
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-charcoal text-text-primary border border-border-luxury hover:border-border-light hover:bg-charcoal/80 transition-all"
          >
            <Clock className="w-4 h-4" />
            Расписание
          </Link>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-charcoal text-text-primary border border-border-luxury hover:border-border-light hover:bg-charcoal/80 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Клиенты
          </Link>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Запись
          </Link>
        </div>
      </div>

      {/* KPI analytics — client component handles useLanguage */}
      <DashboardAnalytics summary={summary} />

      {/* Legacy stat cards — kept for backward compat with legacy UI version */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Link href="/bookings" className="block hover:scale-[1.01] transition-transform">
          <StatCard
            title="Записи сегодня"
            value={bookings.today.total}
            subtitle={`${bookings.today.upcoming} ожидают подтверждения`}
            icon={<Calendar className="w-5 h-5" />}
          />
        </Link>
        <Link href="/analytics" className="block hover:scale-[1.01] transition-transform">
          <StatCard
            title="Выручка за неделю"
            value={formatCurrency(revenue.thisWeek.total)}
            subtitle="завершённые записи"
            trend={
              revenue.trend.vsLastWeek !== 0
                ? {
                    value: Math.abs(revenue.trend.vsLastWeek),
                    positive: revenue.trend.vsLastWeek >= 0,
                    label: 'vs пред. неделя',
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
            title="Специалистов активных"
            value={specialists.active}
            subtitle={`${specialists.workingToday} работают сегодня`}
            icon={<Users className="w-5 h-5" />}
          />
        </Link>
      </div>

      {/* Today's schedule link */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Записи на сегодня</h3>
          <Link href="/bookings" className="text-xs text-champagne hover:text-champagne-light transition-colors">
            Все записи →
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Calendar className="w-10 h-10 text-text-tertiary" />
          <p className="text-text-secondary text-sm">
            {bookings.today.total > 0
              ? `${bookings.today.total} записей · ${bookings.today.completed} завершено · ${bookings.today.upcoming} предстоит`
              : 'На сегодня записей нет'}
          </p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all"
          >
            <Calendar className="w-4 h-4" />
            Открыть расписание
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const summary = (await getSummary()) ?? EMPTY_SUMMARY;

  const hour = new Date().getHours();
  const greeting =
    hour < 6  ? 'Доброй ночи'  :
    hour < 12 ? 'Доброе утро'  :
    hour < 17 ? 'Добрый день'  :
    hour < 22 ? 'Добрый вечер' : 'Доброй ночи';

  // Map summary to the legacy DashboardData shape for NextDashboard compatibility.
  const legacyData = {
    todayBookings: summary.bookings.today.total,
    pendingCount: summary.bookings.today.upcoming,
    revenueMtd: summary.revenue.thisWeek.total,
    revenueTrend: summary.revenue.trend.vsLastWeek,
    totalClients: 0,
    newClientsThisMonth: 0,
    appointments: [] as {
      id: string;
      client: string;
      service: string;
      specialist: string;
      time: Date;
      status: string;
      amount: number;
    }[],
  };

  return (
    <UIPageWrapper
      legacy={<LegacyDashboardContent summary={summary} greeting={greeting} />}
      next={<NextDashboard data={legacyData} />}
    />
  );
}
