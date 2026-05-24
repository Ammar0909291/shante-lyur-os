'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, TrendingUp, Users, LayoutGrid, Clock } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { DashboardAnalytics } from './DashboardAnalytics';
import { DashboardGreeting } from './DashboardGreeting';
import type { DashboardSummary } from '@/types/analytics';
import type { TodayOperationsResponse, OperationalAppointment } from '@/types/operations';

// ── Mini ops board widget ──────────────────────────────────────────────────────
const TIMEZONE = 'Asia/Yekaterinburg';

function formatLocalTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
}

const STATUS_DOT: Record<string, string> = {
  PENDING:     'bg-amber-400',
  CONFIRMED:   'bg-yellow-400',
  ARRIVED:     'bg-yellow-300',
  WAITING:     'bg-orange-400',
  IN_PROGRESS: 'bg-emerald-400',
  COMPLETED:   'bg-zinc-500',
  CANCELLED:   'bg-red-500',
  NO_SHOW:     'bg-zinc-600',
  RESCHEDULED: 'bg-blue-400',
};

function MiniOpsWidget() {
  const [data, setData] = React.useState<TodayOperationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/operations/today', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.success) setData(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Show upcoming + in-progress appointments
  const upcoming = React.useMemo<OperationalAppointment[]>(() => {
    if (!data) return [];
    return data.queue
      .filter(a => !['CANCELLED', 'NO_SHOW', 'RESCHEDULED', 'COMPLETED'].includes(a.operationalStatus))
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 5);
  }, [data]);

  const m = data?.metrics;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-5 h-5 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || (m?.totalBookings ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Calendar className="w-10 h-10 text-text-tertiary" />
        <p className="text-text-secondary text-sm">Записей на сегодня нет</p>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all"
        >
          <Calendar className="w-4 h-4" />
          Открыть записи
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Mini status summary */}
      <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border-luxury">
        {[
          { label: 'Активных',  value: (m?.pending ?? 0) + (m?.confirmed ?? 0) + (m?.arrived ?? 0) + (m?.waiting ?? 0), color: 'text-yellow-300' },
          { label: 'В работе',  value: m?.inProgress ?? 0,  color: 'text-emerald-300' },
          { label: 'Завершено', value: m?.completed ?? 0,   color: 'text-zinc-400' },
          { label: 'Отмен',     value: (m?.cancelled ?? 0) + (m?.noShow ?? 0), color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={cn('text-lg font-medium font-mono', color)}>{value}</p>
            <p className="text-[10px] text-text-tertiary">{label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming appointments list */}
      <div className="divide-y divide-border-luxury/50">
        {upcoming.map(apt => (
          <div key={apt.id} className="flex items-center gap-3 px-5 py-2.5">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[apt.operationalStatus] ?? 'bg-zinc-500')} />
            <span className="text-xs font-mono text-text-tertiary w-10 flex-shrink-0">{formatLocalTime(apt.startAt)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{apt.clientName}</p>
              <p className="text-[10px] text-text-secondary truncate">{apt.services[0]} · {apt.specialistName}</p>
            </div>
            <span className="text-[10px] text-text-tertiary flex-shrink-0">{apt.duration} мин</span>
          </div>
        ))}
      </div>

      {/* Open live board CTA */}
      <div className="px-5 py-4 border-t border-border-luxury flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          Всего сегодня: <span className="text-text-primary font-medium">{m?.totalBookings}</span>
        </p>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Live Панель
        </Link>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function LegacyDashboardContent({ summary }: { summary: DashboardSummary }) {
  const { t } = useLanguage();
  const { bookings, revenue, specialists } = summary;

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

      {/* Live Operational Board Widget */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-champagne" />
            <h3 className="font-serif text-lg font-medium text-text-primary">{t('dashboard.todaySchedule')}</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleTimeString('ru-RU', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' })}
            </div>
            <Link href="/bookings" className="text-xs text-champagne hover:text-champagne-light transition-colors">
              {t('dashboard.viewAll')}
            </Link>
          </div>
        </div>
        <MiniOpsWidget />
      </div>
    </div>
  );
}
