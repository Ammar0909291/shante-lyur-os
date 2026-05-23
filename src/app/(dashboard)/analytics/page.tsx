'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  BarChart3,
  Award,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { useLocale } from '@/components/providers/locale-provider';

interface RevenuePoint {
  label: string;
  value: number;
}

interface TopSpecialist {
  name: string;
  revenue: number;
  bookings: number;
  share: number;
}

interface TopService {
  name: string;
  count: number;
  revenue: number;
}

const MOCK_MONTHLY: RevenuePoint[] = [
  { label: 'Янв', value: 4800000 },
  { label: 'Фев', value: 5200000 },
  { label: 'Мар', value: 6100000 },
  { label: 'Апр', value: 5800000 },
  { label: 'Май', value: 7200000 },
  { label: 'Июн', value: 8100000 },
  { label: 'Июл', value: 7600000 },
  { label: 'Авг', value: 8400000 },
  { label: 'Сен', value: 9100000 },
  { label: 'Окт', value: 8800000 },
  { label: 'Ноя', value: 9600000 },
  { label: 'Дек', value: 11200000 },
];

const MOCK_TOP_SPECIALISTS: TopSpecialist[] = [
  { name: 'Елена Смирнова', revenue: 154000000, bookings: 312, share: 28 },
  { name: 'Мария Попова', revenue: 126000000, bookings: 278, share: 23 },
  { name: 'Ирина Соколова', revenue: 118500000, bookings: 241, share: 22 },
  { name: 'Алина Петрова', revenue: 95000000, bookings: 189, share: 17 },
  { name: 'Ольга Лебедева', revenue: 60000000, bookings: 156, share: 10 },
];

const MOCK_TOP_SERVICES: TopService[] = [
  { name: 'Окрашивание волос', count: 184, revenue: 82800000 },
  { name: 'Маникюр с гель-лаком', count: 267, revenue: 58740000 },
  { name: 'Уход за лицом', count: 142, revenue: 53960000 },
  { name: 'Педикюр аппаратный', count: 198, revenue: 55440000 },
  { name: 'Наращивание ресниц', count: 113, revenue: 47460000 },
];

function MiniBarChart({ data }: { data: RevenuePoint[] }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((point, i) => {
        const height = max > 0 ? Math.max(4, (point.value / max) * 96) : 4;
        const isLast = i === data.length - 1;
        return (
          <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5 group relative">
            <div
              className={cn(
                'w-full rounded-t-sm transition-all',
                isLast ? 'luxury-gradient' : 'bg-champagne/25 group-hover:bg-champagne/40',
              )}
              style={{ height: `${height}px` }}
            />
            <span className="text-[9px] text-text-tertiary">{point.label}</span>
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-charcoal border border-border-luxury rounded-lg px-2 py-1 text-xs text-text-primary whitespace-nowrap">
                {formatCurrency(point.value)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-champagne' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full h-1.5 bg-charcoal rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useLocale();
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<'week' | 'month' | 'year'>('month');

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const totalRevenue = MOCK_MONTHLY.reduce((acc, p) => acc + p.value, 0);
  const currentMonth = MOCK_MONTHLY[MOCK_MONTHLY.length - 1];
  const prevMonth = MOCK_MONTHLY[MOCK_MONTHLY.length - 2];
  const revenueGrowth = prevMonth.value > 0
    ? ((currentMonth.value - prevMonth.value) / prevMonth.value) * 100
    : 0;

  const maxServiceCount = Math.max(...MOCK_TOP_SERVICES.map(s => s.count));
  const maxSpecRevenue = Math.max(...MOCK_TOP_SPECIALISTS.map(s => s.revenue));

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">
            {t('nav.analytics')}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Ключевые показатели эффективности
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {([['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all',
                period === key
                  ? 'bg-champagne/10 text-champagne border border-champagne/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-charcoal border border-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Выручка (год)"
          value={loading ? '—' : formatCurrency(totalRevenue)}
          trend={{ value: Math.round(revenueGrowth), positive: revenueGrowth >= 0, label: 'к прошлому месяцу' }}
          icon={<TrendingUp className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Этот месяц"
          value={loading ? '—' : formatCurrency(currentMonth.value)}
          trend={{ value: Math.round(revenueGrowth), positive: revenueGrowth >= 0 }}
          icon={<BarChart3 className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Всего записей"
          value={loading ? '—' : MOCK_TOP_SPECIALISTS.reduce((a, s) => a + s.bookings, 0)}
          icon={<Calendar className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Активных клиентов"
          value={loading ? '—' : '247'}
          trend={{ value: 12, positive: true, label: 'новых за месяц' }}
          icon={<Users className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text-primary">Динамика выручки</h2>
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            {revenueGrowth >= 0
              ? <TrendingUp className="w-3.5 h-3.5 text-sage" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
            <span className={revenueGrowth >= 0 ? 'text-sage' : 'text-red-400'}>
              {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </span>
            <span>за последний период</span>
          </div>
        </div>
        {loading ? (
          <div className="h-24 bg-charcoal rounded-xl animate-shimmer" />
        ) : (
          <MiniBarChart data={MOCK_MONTHLY} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Specialists */}
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border-luxury">
            <Award className="w-4 h-4 text-champagne" />
            <h2 className="text-sm font-semibold text-text-primary">Топ мастеров</h2>
          </div>
          <div className="divide-y divide-border-luxury">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 space-y-2">
                  <div className="h-4 w-36 bg-charcoal rounded animate-shimmer" />
                  <div className="h-2 bg-charcoal rounded animate-shimmer" />
                </div>
              ))
            ) : (
              MOCK_TOP_SPECIALISTS.map((spec, i) => (
                <div key={spec.name} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        i === 0 ? 'bg-champagne/20 text-champagne' :
                        i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                        i === 2 ? 'bg-orange-700/20 text-orange-400' :
                        'bg-charcoal text-text-tertiary',
                      )}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-text-primary">{spec.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-champagne">
                      {formatCurrency(spec.revenue)}
                    </span>
                  </div>
                  <ProgressBar value={spec.revenue} max={maxSpecRevenue} />
                  <div className="flex items-center justify-between mt-1.5 text-xs text-text-tertiary">
                    <span>{spec.bookings} записей</span>
                    <span>{spec.share}% выручки</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border-luxury">
            <BarChart3 className="w-4 h-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">Популярные услуги</h2>
          </div>
          <div className="divide-y divide-border-luxury">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 space-y-2">
                  <div className="h-4 w-40 bg-charcoal rounded animate-shimmer" />
                  <div className="h-2 bg-charcoal rounded animate-shimmer" />
                </div>
              ))
            ) : (
              MOCK_TOP_SERVICES.map((svc, i) => (
                <div key={svc.name} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-text-primary">{svc.name}</span>
                    <span className="text-xs text-text-tertiary">{svc.count} раз</span>
                  </div>
                  <ProgressBar
                    value={svc.count}
                    max={maxServiceCount}
                    color={i === 0 ? 'bg-champagne' : i === 1 ? 'bg-lavender' : 'bg-sage'}
                  />
                  <div className="flex items-center justify-end mt-1.5">
                    <span className="text-xs text-champagne font-medium">{formatCurrency(svc.revenue)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Conversion Summary */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Конверсия по статусам</h2>
        {loading ? (
          <div className="h-10 bg-charcoal rounded-xl animate-shimmer" />
        ) : (
          <div className="flex rounded-xl overflow-hidden h-8 text-xs font-medium">
            {[
              { label: 'Завершено', pct: 68, color: 'bg-sage' },
              { label: 'Подтверждено', pct: 18, color: 'bg-blue-500/70' },
              { label: 'Ожидание', pct: 8, color: 'bg-amber-500/70' },
              { label: 'Отменено', pct: 4, color: 'bg-red-500/60' },
              { label: 'Не явился', pct: 2, color: 'bg-zinc-500/60' },
            ].map((seg) => (
              <div
                key={seg.label}
                className={cn('flex items-center justify-center text-obsidian font-semibold transition-all hover:opacity-80', seg.color)}
                style={{ width: `${seg.pct}%` }}
                title={`${seg.label}: ${seg.pct}%`}
              >
                {seg.pct >= 10 && `${seg.pct}%`}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-4 mt-3">
          {[
            { label: 'Завершено', pct: 68, color: 'bg-sage' },
            { label: 'Подтверждено', pct: 18, color: 'bg-blue-500/70' },
            { label: 'Ожидание', pct: 8, color: 'bg-amber-500/70' },
            { label: 'Отменено', pct: 4, color: 'bg-red-500/60' },
            { label: 'Не явился', pct: 2, color: 'bg-zinc-500/60' },
          ].map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <div className={cn('w-2.5 h-2.5 rounded-full', seg.color)} />
              {seg.label} ({seg.pct}%)
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
