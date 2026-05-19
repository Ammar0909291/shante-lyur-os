'use client';

import * as React from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';

interface RevenueGroup {
  label: string;
  revenue: number;
  refunds: number;
  net: number;
  count?: number;
}

interface RevenueReport {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  groups: RevenueGroup[];
  byProvider?: Record<string, number>;
}

interface ApiResponse {
  success: boolean;
  data: RevenueReport;
}

function formatDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function AnalyticsPage() {
  const [report, setReport] = React.useState<RevenueReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [groupBy, setGroupBy] = React.useState<'day' | 'week' | 'month'>('day');

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = startOfMonth(new Date());
      const to = endOfToday();
      const params = new URLSearchParams({
        from: formatDateParam(from),
        to: formatDateParam(to),
        groupBy,
      });

      const res = await fetch(`/api/admin/revenue?${params}`, { credentials: 'include' });
      const json: ApiResponse = await res.json();
      if (!json.success) throw new Error('Не удалось загрузить данные');
      setReport(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [groupBy]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const maxRevenue = report?.groups.reduce((m: number, g: RevenueGroup) => Math.max(m, g.net), 0) ?? 1;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary">Аналитика</h2>
          <p className="text-text-secondary text-sm mt-0.5">Текущий месяц</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-luxury overflow-hidden">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  groupBy === g
                    ? 'bg-champagne/10 text-champagne'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {g === 'day' ? 'По дням' : g === 'week' ? 'По неделям' : 'По месяцам'}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchReport}
            isLoading={loading}
          >
            Обновить
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchReport}>
            Повторить
          </Button>
        </div>
      ) : loading && !report ? (
        <div className="flex items-center justify-center py-20 text-text-tertiary">
          <span className="animate-pulse">Загрузка...</span>
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Выручка за месяц"
              value={formatCurrency(report.totalRevenue)}
              subtitle="Все платежи"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              title="Возвраты"
              value={formatCurrency(report.totalRefunds)}
              subtitle="Сумма возвратов"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              title="Чистая выручка"
              value={formatCurrency(report.netRevenue)}
              subtitle="После вычета возвратов"
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>

          {/* Revenue chart (bar chart) */}
          {report.groups.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
              <h3 className="font-serif text-lg font-medium text-text-primary mb-6">
                Динамика выручки
              </h3>
              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                {report.groups.map((g: RevenueGroup, i: number) => {
                  const heightPct = maxRevenue > 0 ? (g.net / maxRevenue) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group"
                    >
                      <div className="relative w-full flex items-end" style={{ height: '160px' }}>
                        <div
                          className="w-full bg-champagne/20 hover:bg-champagne/30 rounded-sm transition-colors cursor-default"
                          style={{ height: `${Math.max(heightPct, 1)}%` }}
                          title={`${g.label}: ${formatCurrency(g.net)}`}
                        />
                      </div>
                      <span className="text-[10px] text-text-tertiary truncate w-full text-center">
                        {g.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Provider breakdown */}
          {report.byProvider && Object.keys(report.byProvider).length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
              <h3 className="font-serif text-lg font-medium text-text-primary mb-4">
                По способу оплаты
              </h3>
              <div className="space-y-3">
                {Object.entries(report.byProvider as Record<string, number>).map(([provider, amount]: [string, number]) => {
                  const pct = report.totalRevenue > 0
                    ? Math.round((amount / report.totalRevenue) * 100)
                    : 0;
                  return (
                    <div key={provider}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-text-secondary">{provider}</span>
                        <span className="text-text-primary font-medium tabular-nums">
                          {formatCurrency(amount)}
                          <span className="text-text-tertiary font-normal ml-2">{pct}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
                        <div
                          className="h-full bg-champagne/50 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed table */}
          {report.groups.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">
                  Детализация
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-luxury">
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Период
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Выручка
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Возвраты
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Чистая
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-luxury">
                    {report.groups.map((g: RevenueGroup, i: number) => (
                      <tr key={i} className="hover:bg-charcoal/50 transition-colors">
                        <td className="px-6 py-3 text-text-secondary">{g.label}</td>
                        <td className="px-4 py-3 text-right text-text-primary tabular-nums">
                          {formatCurrency(g.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400 tabular-nums">
                          {g.refunds > 0 ? `−${formatCurrency(g.refunds)}` : '—'}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-text-primary tabular-nums">
                          {formatCurrency(g.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
