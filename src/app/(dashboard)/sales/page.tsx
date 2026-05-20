'use client';

import * as React from 'react';
import { TrendingUp, Users, ShoppingBag, Award, Calendar } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Администратор',
  SPECIALIST: 'Специалист',
  OPERATOR: 'Оператор',
  SUPER_ADMIN: 'Супер-администратор',
};

interface SellerRow {
  userId: string;
  name: string;
  role: string;
  revenue: number;
  count: number;
  avg: number;
}

interface DailyRow {
  day: string;
  revenue: number;
  count: number;
}

interface SalesData {
  leaderboard: SellerRow[];
  totals: { revenue: number; count: number };
  daily: DailyRow[];
  from: string;
  to: string;
}

const PRESETS = [
  { label: 'Сегодня', days: 0 },
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
];

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className={cn('p-2.5 rounded-xl w-fit mb-3', accent ? 'bg-champagne/20 text-champagne' : 'bg-charcoal text-text-tertiary')}>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SalesPage() {
  const [data, setData] = React.useState<SalesData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activePreset, setActivePreset] = React.useState(1); // 7 days default

  const fetchData = React.useCallback(async (days: number) => {
    setLoading(true);
    try {
      const to = new Date();
      const from = days === 0 ? new Date(to.toDateString()) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const res = await fetch(`/api/admin/sales?from=${toIso(from)}&to=${toIso(to)}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData(PRESETS[activePreset].days);
  }, [activePreset, fetchData]);

  const topSeller = data?.leaderboard[0] ?? null;
  const maxRevenue = data?.leaderboard[0]?.revenue ?? 1;

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Продажи</h2>
          <p className="text-text-secondary mt-1 text-sm">Аналитика продаж по сотрудникам</p>
        </div>
        <div className="flex gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActivePreset(i)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                activePreset === i
                  ? 'bg-champagne/10 border-champagne/40 text-champagne'
                  : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Выручка за период"
              value={formatCurrency(data?.totals.revenue ?? 0)}
              accent
            />
            <StatCard
              icon={<ShoppingBag className="w-5 h-5" />}
              label="Записей за период"
              value={(data?.totals.count ?? 0).toString()}
              sub="подтверждённых"
            />
            <StatCard
              icon={<Award className="w-5 h-5" />}
              label="Средний чек"
              value={data && data.totals.count > 0
                ? formatCurrency(Math.round(data.totals.revenue / data.totals.count))
                : '—'}
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Активных продавцов"
              value={(data?.leaderboard.length ?? 0).toString()}
              sub={topSeller ? `Лидер: ${topSeller.name.split(' ')[0]}` : 'Нет данных'}
            />
          </div>

          {/* Daily chart */}
          {data && data.daily.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-text-tertiary" />
                <h3 className="font-serif text-lg font-medium text-text-primary">Динамика выручки</h3>
              </div>
              <div className="flex items-end gap-1 h-32">
                {(() => {
                  const maxRev = Math.max(...data.daily.map((d) => d.revenue), 1);
                  return data.daily.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full bg-champagne/20 hover:bg-champagne/40 transition-colors rounded-t-sm relative"
                        style={{ height: `${Math.max(4, (d.revenue / maxRev) * 100)}%` }}
                        title={`${new Date(d.day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}: ${formatCurrency(d.revenue)}`}
                      />
                    </div>
                  ));
                })()}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-text-tertiary">
                {data.daily.length > 0 && (
                  <>
                    <span>{new Date(data.daily[0].day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                    <span>{new Date(data.daily[data.daily.length - 1].day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Рейтинг продавцов</h3>
              <p className="text-xs text-text-tertiary mt-0.5">По выручке за выбранный период</p>
            </div>

            {data?.leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <TrendingUp className="w-10 h-10 text-text-tertiary" />
                <p className="text-sm text-text-secondary">Нет данных за выбранный период</p>
                <p className="text-xs text-text-tertiary">Данные появятся после создания записей</p>
              </div>
            ) : (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-luxury">
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary w-8">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Сотрудник</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Роль</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Записей</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Средний чек</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Выручка</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-luxury">
                      {data?.leaderboard.map((row, i) => (
                        <tr key={row.userId} className="hover:bg-charcoal/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <span className={cn(
                              'text-sm font-bold tabular-nums',
                              i === 0 ? 'text-champagne' : i === 1 ? 'text-text-secondary' : 'text-text-tertiary',
                            )}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={row.name} size="sm" />
                              <div>
                                <p className="font-medium text-text-primary">{row.name}</p>
                                <div
                                  className="mt-1 h-1 rounded-full bg-champagne/20"
                                  style={{ width: `${Math.round((row.revenue / maxRevenue) * 120)}px`, maxWidth: '120px' }}
                                >
                                  <div
                                    className="h-full rounded-full bg-champagne"
                                    style={{ width: `${Math.round((row.revenue / maxRevenue) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="default">{ROLE_LABEL[row.role] ?? row.role}</Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right text-text-secondary tabular-nums">{row.count}</td>
                          <td className="px-4 py-3.5 text-right text-text-secondary tabular-nums">{formatCurrency(row.avg)}</td>
                          <td className="px-6 py-3.5 text-right font-semibold text-champagne tabular-nums">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden divide-y divide-border-luxury">
                  {data?.leaderboard.map((row, i) => (
                    <div key={row.userId} className="px-4 py-4 flex items-start gap-3">
                      <span className={cn(
                        'text-lg font-bold tabular-nums w-6 text-right shrink-0 mt-1',
                        i === 0 ? 'text-champagne' : 'text-text-tertiary',
                      )}>
                        {i + 1}
                      </span>
                      <Avatar name={row.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-text-primary text-sm">{row.name}</p>
                          <span className="font-semibold text-champagne text-sm tabular-nums">{formatCurrency(row.revenue)}</span>
                        </div>
                        <p className="text-xs text-text-tertiary mt-0.5">{ROLE_LABEL[row.role] ?? row.role} · {row.count} записей</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
