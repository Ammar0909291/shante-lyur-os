'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, CheckCircle, Target,
  Download, Users, UserCheck, UserPlus, Repeat, Clock,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface SeriesPoint { date: string; revenue: number; bookings: number; }
interface StatusItem { status: string; label: string; count: number; }
interface TopSpecialist { specialistId: string; name: string; revenue: number; count: number; }
interface SpecialistPerf { specialistId: string; name: string; revenue: number; count: number; bookedHours: number; }
interface ServiceMetric { serviceId: string; name: string; category: string; revenue: number; count: number; }
interface ClientMetrics { totalInPeriod: number; newClients: number; returningClients: number; retentionRate: number; }
interface HeatmapCell { dow: number; hour: number; count: number; }
interface PreviousPeriod { totalRevenue: number; totalBookings: number; revenueDelta: number | null; bookingsDelta: number | null; }
interface Summary { totalRevenue: number; totalBookings: number; completedCount: number; completionRate: number; avgTicket: number; }

interface AnalyticsData {
  series: SeriesPoint[];
  statusBreakdown: StatusItem[];
  topSpecialists: TopSpecialist[];
  specialistPerformance: SpecialistPerf[];
  serviceMetrics: ServiceMetric[];
  clientMetrics: ClientMetrics;
  heatmap: HeatmapCell[];
  previousPeriod: PreviousPeriod;
  summary: Summary;
  range: string;
  groupBy: string;
}

const RANGES = [
  { value: '1d', label: '1 день' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '1 месяц' },
  { value: '3m', label: '3 месяца' },
  { value: '6m', label: '6 месяцев' },
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

const DOW_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

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

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-green-400' : 'text-red-400')}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{value}%
    </span>
  );
}

function MetricCard({
  icon, label, value, sub, delta,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; delta?: number | null;
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="p-2.5 rounded-xl bg-champagne/10 text-champagne shrink-0">
          {icon}
        </div>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <p className="text-2xl font-semibold text-text-primary mt-3 tabular-nums">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

function exportToExcel(data: AnalyticsData, range: string) {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? range;

    const summaryRows = [
      ['Shante Lyur OS — Аналитика', '', `Период: ${rangeLabel}`],
      [],
      ['Показатель', 'Значение'],
      ['Выручка (₽)', data.summary.totalRevenue],
      ['Всего записей', data.summary.totalBookings],
      ['Завершено', data.summary.completedCount],
      ['Конверсия (%)', data.summary.completionRate],
      ['Средний чек (₽)', data.summary.avgTicket],
      [],
      ['Клиенты за период', data.clientMetrics.totalInPeriod],
      ['Новые клиенты', data.clientMetrics.newClients],
      ['Возвратные клиенты', data.clientMetrics.returningClients],
      ['Удержание (%)', data.clientMetrics.retentionRate],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Сводка');

    const seriesRows = [
      ['Дата', 'Выручка (₽)', 'Записей'],
      ...data.series.map((p) => [p.date, p.revenue, p.bookings]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(seriesRows);
    ws2['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Динамика');

    const statusRows = [
      ['Статус', 'Количество'],
      ...data.statusBreakdown.map((s) => [s.label, s.count]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(statusRows);
    ws3['!cols'] = [{ wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'По статусам');

    if (data.specialistPerformance.length > 0) {
      const specRows = [
        ['Специалист', 'Выручка (₽)', 'Записей', 'Часов'],
        ...data.specialistPerformance.map((s) => [s.name, s.revenue, s.count, s.bookedHours]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(specRows);
      ws4['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Специалисты');
    }

    if (data.serviceMetrics.length > 0) {
      const svcRows = [
        ['Услуга', 'Категория', 'Выручка (₽)', 'Кол-во'],
        ...data.serviceMetrics.map((s) => [s.name, s.category, s.revenue, s.count]),
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(svcRows);
      ws5['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws5, 'Услуги');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `shante-lyur-analytics-${dateStr}.xlsx`);
  });
}

interface SpecialistOption { id: string; firstName: string; lastName: string; }

// Build 7×24 heatmap grid. Max count used to normalise cell intensity.
function HeatmapGrid({ data }: { data: HeatmapCell[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const map = new Map(data.map((d) => [`${d.dow}-${d.hour}`, d.count]));

  // Show hours 8-22 to keep it compact
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Hour labels */}
        <div className="flex mb-1 pl-8">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-text-tertiary">
              {h}
            </div>
          ))}
        </div>
        {/* Rows per day */}
        {DOW_LABELS.map((day, dow) => (
          <div key={dow} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-8 text-[11px] text-text-tertiary shrink-0">{day}</span>
            {hours.map((h) => {
              const count = map.get(`${dow}-${h}`) ?? 0;
              const intensity = count / maxCount;
              return (
                <div
                  key={h}
                  className="flex-1 h-6 rounded-sm"
                  style={{
                    backgroundColor: count === 0
                      ? 'rgba(42,42,56,0.6)'
                      : `rgba(212,175,122,${0.12 + intensity * 0.88})`,
                  }}
                  title={`${day} ${h}:00 — ${count} записей`}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-2 mt-2 pl-8">
          <span className="text-[10px] text-text-tertiary">Меньше</span>
          {[0.12, 0.35, 0.58, 0.78, 1].map((op) => (
            <div
              key={op}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: `rgba(212,175,122,${op})` }}
            />
          ))}
          <span className="text-[10px] text-text-tertiary">Больше</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = React.useState('30d');
  const [specialistId, setSpecialistId] = React.useState('');
  const [specialists, setSpecialists] = React.useState<SpecialistOption[]>([]);
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetch('/api/specialists?limit=100&status=ACTIVE')
      .then((r) => r.json())
      .then((json) => { if (json.success) setSpecialists(json.data.items ?? []); })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    setLoading(true);
    setError('');
    const q = new URLSearchParams({ range });
    if (specialistId) q.set('specialistId', specialistId);
    fetch(`/api/analytics?${q}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError('Ошибка загрузки данных');
      })
      .catch(() => setError('Сетевая ошибка'))
      .finally(() => setLoading(false));
  }, [range, specialistId]);

  const chartSeries = data?.series.map((p) => ({
    ...p,
    label: formatDateLabel(p.date, data.groupBy),
  })) ?? [];

  const hasRevenue = (data?.summary.totalRevenue ?? 0) > 0;
  const hasBookings = (data?.summary.totalBookings ?? 0) > 0;

  // Max revenue for specialist bar chart normalisation
  const maxSpecRev = Math.max(1, ...(data?.specialistPerformance.map((s) => s.revenue) ?? []));

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header + filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Аналитика</h2>
            <p className="text-text-secondary mt-1 text-sm">Операционная отчётность студии</p>
          </div>
          {data && (
            <button
              onClick={() => exportToExcel(data, range)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                'bg-onyx border border-border-luxury text-text-secondary',
                'hover:text-text-primary hover:border-champagne/40 transition-all',
              )}
            >
              <Download className="w-4 h-4" />
              Экспорт Excel
            </button>
          )}
        </div>
        {/* Sub-navigation to specialised analytics pages */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/analytics/financial"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-xl border border-border-luxury bg-onyx text-text-secondary hover:text-champagne hover:border-champagne/40 transition-all"
          >
            Финансы
          </Link>
          <Link
            href="/analytics/massage"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-xl border border-border-luxury bg-onyx text-text-secondary hover:text-champagne hover:border-champagne/40 transition-all"
          >
            Нагрузка массажистов
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
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
          {specialists.length > 0 && (
            <select
              value={specialistId}
              onChange={(e) => setSpecialistId(e.target.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-sm cursor-pointer',
                'bg-onyx border text-text-secondary transition-colors',
                specialistId
                  ? 'border-champagne/40 text-text-primary'
                  : 'border-border-luxury hover:text-text-primary hover:bg-charcoal',
              )}
            >
              <option value="">Все специалисты</option>
              {specialists.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          )}
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
          {/* ── Revenue KPIs ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Выручка"
              value={formatCurrency(data.summary.totalRevenue)}
              sub="завершённые записи"
              delta={data.previousPeriod.revenueDelta}
            />
            <MetricCard
              icon={<Calendar className="w-5 h-5" />}
              label="Всего записей"
              value={data.summary.totalBookings.toLocaleString('ru-RU')}
              delta={data.previousPeriod.bookingsDelta}
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

          {/* ── Client acquisition KPIs ───────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Users className="w-5 h-5" />}
              label="Клиентов за период"
              value={data.clientMetrics.totalInPeriod.toLocaleString('ru-RU')}
            />
            <MetricCard
              icon={<UserPlus className="w-5 h-5" />}
              label="Новые клиенты"
              value={data.clientMetrics.newClients.toLocaleString('ru-RU')}
            />
            <MetricCard
              icon={<Repeat className="w-5 h-5" />}
              label="Возвратные"
              value={data.clientMetrics.returningClients.toLocaleString('ru-RU')}
            />
            <MetricCard
              icon={<UserCheck className="w-5 h-5" />}
              label="Удержание"
              value={`${data.clientMetrics.retentionRate}%`}
              sub="возвратных от всех"
            />
          </div>

          {/* ── Revenue area chart ────────────────────────────────── */}
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
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6A6560' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: '#6A6560' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v} width={40} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Выручка']} labelStyle={{ color: '#9A9490', marginBottom: 4 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#D4AF7A" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#D4AF7A', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Bookings bar + status pie ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6A6560' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#6A6560' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Записей']} labelStyle={{ color: '#9A9490', marginBottom: 4 }} />
                      <Bar dataKey="bookings" fill="#D4AF7A" radius={[3, 3, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

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
                          <Pie data={data.statusBreakdown} dataKey="count" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2}>
                            {data.statusBreakdown.map((item) => (
                              <Cell key={item.status} fill={STATUS_COLORS[item.status] ?? '#6A6560'} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n: string, props: { payload?: StatusItem }) => [v, props.payload?.label ?? '']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      {data.statusBreakdown.map((item) => (
                        <div key={item.status} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[item.status] ?? '#6A6560' }} />
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

          {/* ── Specialist performance ────────────────────────────── */}
          {data.specialistPerformance.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Эффективность специалистов</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Выручка, записи и рабочее время</p>
              </div>
              <div className="divide-y divide-border-luxury">
                {data.specialistPerformance.map((s, i) => {
                  const barWidth = Math.round((s.revenue / maxSpecRev) * 100);
                  return (
                    <div key={s.specialistId} className="px-6 py-3.5">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm font-medium text-text-tertiary tabular-nums w-5 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div className="hidden sm:block">
                            <p className="text-xs text-text-tertiary">Записей</p>
                            <p className="text-sm font-medium text-text-primary">{s.count}</p>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-xs text-text-tertiary flex items-center gap-1"><Clock className="w-3 h-3" />Часов</p>
                            <p className="text-sm font-medium text-text-primary">{s.bookedHours}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-tertiary">Выручка</p>
                            <p className="text-sm font-semibold text-champagne">{formatCurrency(s.revenue)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-9 h-1.5 rounded-full bg-charcoal overflow-hidden">
                        <div className="h-full rounded-full bg-champagne/60 transition-all" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top services ──────────────────────────────────────── */}
          {data.serviceMetrics.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Топ услуги</h3>
                <p className="text-xs text-text-tertiary mt-0.5">По выручке за период</p>
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-luxury">
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Услуга</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Категория</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Кол-во</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Выручка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-luxury">
                    {data.serviceMetrics.map((s, i) => (
                      <tr key={s.serviceId} className="hover:bg-charcoal/30 transition-colors">
                        <td className="px-6 py-3 text-text-tertiary tabular-nums">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-text-primary">{s.name}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{s.category}</td>
                        <td className="px-4 py-3 text-right text-text-secondary tabular-nums">{s.count}</td>
                        <td className="px-6 py-3 text-right font-semibold text-champagne tabular-nums">{formatCurrency(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-border-luxury">
                {data.serviceMetrics.map((s, i) => (
                  <div key={s.serviceId} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm text-text-tertiary w-5 text-right shrink-0">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                        <p className="text-xs text-text-tertiary">{s.count} сеансов</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-champagne shrink-0">{formatCurrency(s.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Booking heatmap ───────────────────────────────────── */}
          {data.heatmap.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Тепловая карта записей</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Активность по дням недели и часам</p>
              </div>
              <div className="p-6">
                <HeatmapGrid data={data.heatmap} />
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
