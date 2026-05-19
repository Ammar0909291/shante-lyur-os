'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart2 } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { apiFetch } from '@/lib/api-fetch';
import { cn, formatCurrency } from '@/lib/utils';

interface RevenueData {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  byGroup: Array<{ key: string; revenue: number; refunds: number; count: number }>;
}

function MetricRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-luxury last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-text-primary">{value}</span>
        {sub && <span className="text-xs text-text-tertiary ml-2">{sub}</span>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [revenue, setRevenue] = React.useState<RevenueData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<'week' | 'month' | 'quarter'>('month');

  const now = new Date();
  const periodDays = { week: 7, month: 30, quarter: 90 }[period];
  const from = new Date(now.getTime() - periodDays * 86400_000);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: now.toISOString(),
        groupBy: 'day',
      });
      const res = await apiFetch(`/api/admin/revenue?${params}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setRevenue(json.data);
      }
    } catch {
      // Silently use null state — analytics is non-critical
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const PERIOD_LABELS = { week: 'Неделя', month: 'Месяц', quarter: 'Квартал' };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Аналитика</h2>
          <p className="text-text-secondary mt-1 text-sm">Финансовые показатели и статистика</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-charcoal rounded-lg p-1 border border-border-luxury shrink-0">
          {(['week', 'month', 'quarter'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
                period === p
                  ? 'bg-champagne/12 text-champagne'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/4',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Выручка за период"
          value={loading ? '—' : formatCurrency(revenue?.totalRevenue ?? 0)}
          subtitle="Все платёжные методы"
          trend={{ value: 0, positive: true, label: PERIOD_LABELS[period].toLowerCase() }}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Чистая выручка"
          value={loading ? '—' : formatCurrency(revenue?.netRevenue ?? 0)}
          subtitle="После возвратов"
          trend={{ value: 0, positive: true, label: PERIOD_LABELS[period].toLowerCase() }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Возвраты"
          value={loading ? '—' : formatCurrency(revenue?.totalRefunds ?? 0)}
          subtitle="За период"
          trend={{ value: 0, positive: false, label: PERIOD_LABELS[period].toLowerCase() }}
          icon={<TrendingDown className="w-5 h-5" />}
        />
        <StatCard
          title="Записей"
          value="—"
          subtitle="За период"
          trend={{ value: 0, positive: true, label: PERIOD_LABELS[period].toLowerCase() }}
          icon={<Calendar className="w-5 h-5" />}
        />
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
          <h3 className="font-serif text-lg font-medium text-text-primary mb-4">Выручка по группам</h3>
          {loading && (
            <div className="py-8 text-center text-text-tertiary text-sm">Загрузка...</div>
          )}
          {!loading && revenue && revenue.byGroup.length > 0 && (
            <div>
              {revenue.byGroup.slice(0, 10).map(g => (
                <MetricRow
                  key={g.key}
                  label={g.key}
                  value={formatCurrency(g.revenue)}
                  sub={`${g.count} записей`}
                />
              ))}
            </div>
          )}
          {!loading && (!revenue || revenue.byGroup.length === 0) && (
            <div className="py-8 text-center text-text-tertiary text-sm">
              Нет данных за выбранный период
            </div>
          )}
        </div>

        <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
          <h3 className="font-serif text-lg font-medium text-text-primary mb-4">Сводка</h3>
          <div>
            <MetricRow label="Выручка" value={loading ? '—' : formatCurrency(revenue?.totalRevenue ?? 0)} />
            <MetricRow label="Возвраты" value={loading ? '—' : formatCurrency(revenue?.totalRefunds ?? 0)} />
            <MetricRow
              label="Чистая выручка"
              value={loading ? '—' : formatCurrency(revenue?.netRevenue ?? 0)}
              sub="= Выручка − Возвраты"
            />
          </div>

          <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-charcoal border border-border-luxury">
            <BarChart2 className="w-5 h-5 text-champagne shrink-0" aria-hidden />
            <p className="text-xs text-text-secondary">
              Детальные графики и прогнозирование будут добавлены в следующей версии.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
