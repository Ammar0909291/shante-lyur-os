'use client';

import * as React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, Calendar, CheckCircle, Target } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface SeriesPoint { date: string; revenue: number; bookings: number; }
interface StatusItem { status: string; label: string; count: number; }
interface TopSpecialist { specialistId: string; name: string; revenue: number; count: number; }
interface Summary { totalRevenue: number; totalBookings: number; completedCount: number; completionRate: number; avgTicket: number; }

interface AnalyticsData {
  series: SeriesPoint[];
  statusBreakdown: StatusItem[];
  topSpecialists: TopSpecialist[];
  summary: Summary;
  range: string;
  groupBy: string;
}

const RANGES = [
  { value: '1d', label: '1 день' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '1 месяц' },
  { value: '1y', label: '1 год' },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#8BA888',
  CONFIRMED: '#D4AF7A',
  PENDING: '#7898C4',
  CANCELLED: '#C47878',
  IN_PROGRESS: '#B8A8D4',
  NO_SHOW: '#9A9490',
};

function formatDateLabel(dateStr: string, groupBy: string): string {
  if (groupBy === 'month') {
    const [y, m] = dateStr.split('-');
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return `${months[Number(m) - 1]} ${y}`;
  }
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const tooltipStyle = {
  backgroundColor: '#13131A',
  border: '1px solid #2A2A38',
  borderRadius: '12px',
  padding: '10px 14px',
  color: '#F0EDE8',
  fontSize: '12px',
};

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="p-2.5 rounded-xl bg-champagne/10 text-champagne shrink-0">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-text-primary mt-3 tabular-nums">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = React.useState('30d');
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError('Ошибка загрузки данных');
      })
      .catch(() => setError('Сетевая ошибка'))
      .finally(() => setLoading(false));
  }, [range]);

  const chartSeries = data?.series.map((p) => ({
    ...p,
    label: formatDateLabel(p.date, data.groupBy),
  })) ?? [];

  const hasRevenue = (data?.summary.totalRevenue ?? 0) > 0;
  const hasBookings = (data?.summary.totalBookings ?? 0) > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header + range filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Аналитика</h2>
          <p className="text-text-secondary mt-1 text-sm">Операционная отчётность студии</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-sm transition-colors',
                range === r.value
                  ? 'bg-champagne text-obsidian font-medium'
                  : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-onyx border border-red-500/20 rounded-2xl flex items-center justify-center py-16">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* Summary metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Выручка"
              value={formatCurrency(data.summary.totalRevenue)}
              sub="завершённые записи"
            />
            <MetricCard
              icon={<Calendar className="w-5 h-5" />}
              label="Всего записей"
              value={data.summary.totalBookings.toLocaleString('ru-RU')}
            />
            <MetricCard
              icon={<CheckCircle className="w-5 h-5" />}
              label="Завершено"
              value={`${data.summary.completionRate}%`}
              sub={`${data.summary.completedCount} из ${data.summary.totalBookings}`}
            />
            <MetricCard
              icon={<Target className="w-5 h-5" />}
              label="Средний чек"
              value={formatCurrency(data.summary.avgTicket)}
            />
          </div>

          {/* Revenue chart */}
          <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Выручка</h3>
              <p className="text-xs text-text-tertiary mt-0.5">Завершённые записи за выбранный период</p>
            </div>
            <div className="p-4 h-64">
              {!hasRevenue ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-text-tertiary text-sm">Нет данных за выбранный период</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF7A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D4AF7A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#6A6560' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6A6560' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [formatCurrency(v), 'Выручка']}
                      labelStyle={{ color: '#9A9490', marginBottom: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#D4AF7A"
                      strokeWidth={2}
                      fill="url(#revGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#D4AF7A', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bookings + status breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bookings bar chart */}
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Записи</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Количество за период</p>
              </div>
              <div className="p-4 h-56">
                {!hasBookings ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-text-tertiary text-sm">Нет данных</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#6A6560' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6A6560' }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [v, 'Записей']}
                        labelStyle={{ color: '#9A9490', marginBottom: 4 }}
                      />
                      <Bar dataKey="bookings" fill="#D4AF7A" radius={[3, 3, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">По статусам</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Распределение записей</p>
              </div>
              <div className="flex items-center gap-4 p-4">
                {data.statusBreakdown.length === 0 ? (
                  <div className="w-full h-48 flex items-center justify-center">
                    <p className="text-text-tertiary text-sm">Нет данных</p>
                  </div>
                ) : (
                  <>
                    <div className="h-48 w-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.statusBreakdown}
                            dataKey="count"
                            nameKey="label"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={2}
                          >
                            {data.statusBreakdown.map((item) => (
                              <Cell
                                key={item.status}
                                fill={STATUS_COLORS[item.status] ?? '#6A6560'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(v: number, _n: string, props: { payload?: StatusItem }) => [v, props.payload?.label ?? '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      {data.statusBreakdown.map((item) => (
                        <div key={item.status} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: STATUS_COLORS[item.status] ?? '#6A6560' }}
                            />
                            <span className="text-sm text-text-secondary truncate">{item.label}</span>
                          </div>
                          <span className="text-sm font-medium text-text-primary tabular-nums shrink-0">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top specialists */}
          {data.topSpecialists.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Топ специалисты</h3>
                <p className="text-xs text-text-tertiary mt-0.5">По выручке за период</p>
              </div>
              <div className="divide-y divide-border-luxury">
                {data.topSpecialists.map((s, i) => (
                  <div key={s.specialistId} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="text-sm font-medium text-text-tertiary tabular-nums w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                      <p className="text-xs text-text-tertiary">{s.count} записей</p>
                    </div>
                    <span className="text-sm font-semibold text-champagne tabular-nums">{formatCurrency(s.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
