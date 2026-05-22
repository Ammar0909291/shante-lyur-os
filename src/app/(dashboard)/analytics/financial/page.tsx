'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Minus, Download, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import type {
  FinancialRevenueResponse,
  PeakHoursResponse,
  FinancialForecastResponse,
} from '@/types/analytics';

// ─── Shared constants ─────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: '#13131A',
  border: '1px solid #2A2A38',
  borderRadius: '12px',
  padding: '10px 14px',
  color: '#F0EDE8',
  fontSize: '12px',
};

const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPI({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: number;
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-2">{label}</p>
      <p className="font-serif text-3xl font-medium text-text-primary leading-none tabular-nums">{value}</p>
      {sub && <p className="text-sm text-text-secondary mt-1">{sub}</p>}
      {trend !== undefined && trend !== 0 && (
        <div className="flex items-center gap-1 mt-2">
          {trend > 0
            ? <TrendingUp className="w-3.5 h-3.5 text-sage" />
            : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
          <span className={cn('text-xs font-semibold', trend > 0 ? 'text-sage' : 'text-red-400')}>
            {trend > 0 ? '+' : ''}{trend}% vs прошлый период
          </span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-6 py-4 border-b border-border-luxury">
      <h3 className="font-serif text-lg font-medium text-text-primary">{title}</h3>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

function PeakHeatmap({ data }: { data: PeakHoursResponse['heatmap'] }) {
  const maxCount = Math.max(1, ...data.map(c => c.bookingCount));
  const cellMap = new Map(data.map(c => [`${c.dayOfWeek}-${c.hour}`, c.bookingCount]));
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7–21

  return (
    <div className="overflow-x-auto p-4">
      <div className="min-w-[560px]">
        <div className="flex mb-1.5 pl-8">
          {hours.map(h => (
            <div key={h} className="flex-1 text-center text-[10px] text-text-tertiary">{h}</div>
          ))}
        </div>
        {DOW_LABELS.map((day, dow) => (
          <div key={dow} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-8 text-[11px] text-text-tertiary shrink-0">{day}</span>
            {hours.map(h => {
              const count = cellMap.get(`${dow}-${h}`) ?? 0;
              const intensity = count / maxCount;
              return (
                <div
                  key={h}
                  className="flex-1 aspect-square rounded-sm transition-colors"
                  style={{ backgroundColor: count === 0 ? '#1A1A24' : `rgba(212,175,122,${0.12 + intensity * 0.75})` }}
                  title={count > 0 ? `${day} ${h}:00 — ${count} записей` : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Date range helpers ───────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleDateString('sv-SE');
}
function daysAgoStr(n: number) {
  return new Date(Date.now() - n * 86_400_000).toLocaleDateString('sv-SE');
}

const PRESETS = [
  { label: '7 дней',   from: () => daysAgoStr(6),  to: todayStr },
  { label: '30 дней',  from: () => daysAgoStr(29), to: todayStr },
  { label: '90 дней',  from: () => daysAgoStr(89), to: todayStr },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function FinancialAnalyticsPage() {
  const { t } = useLanguage();

  const [from, setFrom] = React.useState(() => daysAgoStr(29));
  const [to, setTo] = React.useState(todayStr);
  const [revenue, setRevenue] = React.useState<FinancialRevenueResponse | null>(null);
  const [peakHours, setPeakHours] = React.useState<PeakHoursResponse | null>(null);
  const [forecast, setForecast] = React.useState<FinancialForecastResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const load = React.useCallback(async (f: string, tDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = `?from=${f}&to=${tDate}`;
      const [revRes, peakRes, foreRes] = await Promise.all([
        fetch(`/api/analytics/financial/revenue${qs}`),
        fetch(`/api/analytics/financial/peak-hours${qs}`),
        fetch('/api/analytics/financial/forecast'),
      ]);
      if (!revRes.ok || !peakRes.ok || !foreRes.ok) {
        setError('Не удалось загрузить данные');
        return;
      }
      const [revJson, peakJson, foreJson] = await Promise.all([
        revRes.json(), peakRes.json(), foreRes.json(),
      ]);
      setRevenue(revJson.data);
      setPeakHours(peakJson.data);
      setForecast(foreJson.data);
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(from, to); }, [load, from, to]);

  const handleExport = React.useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/analytics/export/financial?from=${from}&to=${to}`);
      if (!res.ok) { setError('Ошибка экспорта'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${from}_${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Ошибка экспорта');
    } finally {
      setExporting(false);
    }
  }, [from, to]);

  // Build combined forecast chart data (historical + forecast)
  const forecastChartData = React.useMemo(() => {
    if (!forecast) return [];
    const hist = forecast.historicalDays.slice(-14).map(d => ({
      date: d.date.slice(5), // MM-DD
      historical: d.revenue,
      forecast: null as number | null,
    }));
    const fore = forecast.forecast.map(f => ({
      date: f.date.slice(5),
      historical: null as number | null,
      forecast: f.forecastedRevenue,
    }));
    return [...hist, ...fore];
  }, [forecast]);

  const inputCls = 'bg-obsidian border border-border-luxury text-text-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40';

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
            <Link href="/analytics" className="hover:text-champagne transition-colors">Аналитика</Link>
            <span>/</span>
            <span className="text-text-secondary">Финансы</span>
          </div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">
            {t('analytics.financial.title')}
          </h2>
          <p className="text-text-secondary text-sm mt-1">{t('analytics.financial.subtitle')}</p>
        </div>

        {/* Range controls */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setFrom(p.from()); setTo(p.to()); }}
              className={cn(
                'h-8 px-3 text-xs font-medium rounded-lg border transition-all',
                from === p.from() && to === p.to()
                  ? 'bg-champagne/15 border-champagne/40 text-champagne'
                  : 'bg-charcoal border-border-luxury text-text-secondary hover:border-border-light',
              )}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
          <span className="text-text-tertiary text-xs">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-xl border border-border-luxury bg-onyx text-text-secondary hover:text-champagne hover:border-champagne/40 transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Экспорт .xlsx
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-800/40 bg-red-950/20 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-onyx border border-border-luxury rounded-2xl p-5 animate-pulse">
              <div className="h-3 w-24 bg-charcoal rounded mb-3" />
              <div className="h-8 w-32 bg-charcoal rounded mb-2" />
              <div className="h-3 w-20 bg-charcoal rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && revenue && (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPI
              label={t('analytics.financial.revenue')}
              value={formatCurrency(revenue.total)}
              sub={`${revenue.byDay.length} дней`}
              trend={revenue.trend.vsLastPeriod}
            />
            <KPI
              label={t('analytics.financial.sessions')}
              value={String(revenue.byDay.reduce((s, d) => s + d.sessionCount, 0))}
            />
            <KPI
              label={t('analytics.financial.avgTicket')}
              value={formatCurrency(revenue.avgTicket)}
            />
            {revenue.topEarningDay && (
              <KPI
                label={t('analytics.financial.topDay')}
                value={formatCurrency(revenue.topEarningDay.revenue)}
                sub={revenue.topEarningDay.date}
              />
            )}
          </div>

          {/* ── Revenue by category ── */}
          <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
            <SectionHeader title={t('analytics.financial.byCategory')} sub="Суммарная выручка за период" />
            {revenue.byCategory.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-text-tertiary text-sm">Нет данных</div>
            ) : (
              <div className="p-6">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenue.byCategory} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6A6560' }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${Math.round(v / 1000)}k`} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#9A9490' }} axisLine={false} tickLine={false} width={96} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Выручка']} />
                      <Bar dataKey="revenue" fill="#D4AF7A" radius={[0, 4, 4, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ── Specialist type split ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {revenue.bySpecialistType.map(t => (
              <div key={t.specialistType} className="bg-onyx border border-border-luxury rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-champagne" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                    {t.specialistType === 'MASSAGE' ? 'Массаж' : 'Косметология'}
                  </p>
                </div>
                <p className="font-serif text-2xl font-medium text-text-primary tabular-nums">
                  {formatCurrency(t.revenue)}
                </p>
                <p className="text-sm text-text-secondary mt-1">{t.sessionCount} сеансов</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Peak hours heatmap ── */}
      {!loading && peakHours && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <SectionHeader title={t('analytics.financial.peakHours')} sub="Записи по часам и дням недели" />
          {peakHours.heatmap.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-text-tertiary text-sm">Нет данных</div>
          ) : (
            <>
              <PeakHeatmap data={peakHours.heatmap} />
              {peakHours.peakDay && (
                <div className="px-6 pb-4 flex flex-wrap gap-4 text-sm text-text-secondary">
                  {peakHours.peakHour && (
                    <span>
                      Пиковый час: <span className="text-champagne font-medium">
                        {DOW_LABELS[peakHours.peakHour.dayOfWeek]} {peakHours.peakHour.hour}:00
                      </span>
                    </span>
                  )}
                  <span>
                    Лучший день: <span className="text-champagne font-medium">
                      {DOW_LABELS[peakHours.peakDay.dayOfWeek]}
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 7-day forecast ── */}
      {!loading && forecast && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-luxury flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-medium text-text-primary">{t('analytics.financial.forecast')}</h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                Прогноз на основе 7-дневного скользящего среднего
              </p>
            </div>
            <div className="flex items-center gap-2">
              {forecast.trend === 'up' && <span className="flex items-center gap-1 text-sage text-xs font-medium"><TrendingUp className="w-3.5 h-3.5" />Рост</span>}
              {forecast.trend === 'down' && <span className="flex items-center gap-1 text-red-400 text-xs font-medium"><TrendingDown className="w-3.5 h-3.5" />Снижение</span>}
              {forecast.trend === 'stable' && <span className="flex items-center gap-1 text-text-tertiary text-xs font-medium"><Minus className="w-3.5 h-3.5" />Стабильно</span>}
            </div>
          </div>
          <div className="p-6">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF7A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#D4AF7A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8BA888" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8BA888" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6A6560' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#6A6560' }} axisLine={false} tickLine={false} width={32} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name === 'historical' ? 'Факт' : 'Прогноз']} />
                  <Area type="monotone" dataKey="historical" stroke="#D4AF7A" strokeWidth={2} fill="url(#histGrad)" connectNulls />
                  <Area type="monotone" dataKey="forecast" stroke="#8BA888" strokeWidth={2} strokeDasharray="5 4" fill="url(#foreGrad)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-5 mt-3 text-xs text-text-tertiary">
              <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-champagne inline-block" />Факт</div>
              <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-sage inline-block border-dashed" style={{ borderTop: '2px dashed #8BA888', background: 'none' }} />Прогноз ({t('analytics.financial.confidence')}: {forecast.forecast[0]?.confidence ?? '—'})</div>
              <span className="ml-auto">Среднее: {formatCurrency(forecast.rollingAvgRevenue)}/день</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Revenue by day (area chart) ── */}
      {!loading && revenue && revenue.byDay.length > 0 && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <SectionHeader title="Выручка по дням" sub="Завершённые записи" />
          <div className="p-6 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue.byDay.map(d => ({ date: d.date.slice(5), revenue: d.revenue }))} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF7A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF7A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6A6560' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#6A6560' }} axisLine={false} tickLine={false} width={32} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Выручка']} />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF7A" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
