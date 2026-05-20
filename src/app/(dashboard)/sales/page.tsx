'use client';

import * as React from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, ShoppingBag, Award,
  Plus, UserPlus, Repeat,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { RecordSaleModal } from './_components/RecordSaleModal';

// ─── Types ──────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  ADMIN:       'Администратор',
  SPECIALIST:  'Специалист',
  OPERATOR:    'Оператор',
  SUPER_ADMIN: 'Супер-администратор',
};

interface SellerRow {
  userId: string; name: string; role: string;
  revenue: number; count: number; avg: number;
}
interface SpecialistRow {
  specialistId: string; name: string;
  revenue: number; count: number; avg: number;
}
interface DailyRow {
  day: string; revenue: number; count: number; label: string;
}
interface ProcedureRow {
  serviceId: string; name: string; category: string;
  revenue: number; count: number;
}
interface SalesData {
  leaderboard:    SellerRow[];
  specialists:    SpecialistRow[];
  totals: {
    revenue: number; count: number;
    cancelledCount: number; completionRate: number; avgCheck: number;
  };
  previousPeriod: {
    revenue: number; count: number;
    revenueDelta: number | null; countDelta: number | null;
  };
  daily:      DailyRow[];
  procedures: ProcedureRow[];
  clientMetrics: { totalUnique: number; newClients: number; returningClients: number };
  from: string;
  to:   string;
}
interface BookingRecord {
  id: string; clientName: string; specialistName: string;
  locationName: string; startAt: string;
  totalPrice: number; totalDuration: number; status: string;
  services: { name: string; price: number }[];
}

const PRESETS = [
  { label: 'Сегодня', days: 0 },
  { label: '7 дней',  days: 7  },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
];

const tooltipStyle = {
  backgroundColor: '#13131A',
  border: '1px solid #2A2A38',
  borderRadius: '12px',
  padding: '10px 14px',
  color: '#F0EDE8',
  fontSize: '12px',
};

// ─── Small components ────────────────────────────────────────────────────────

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

function KpiCard({ label, value, sub, icon, accent, delta }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accent?: boolean; delta?: number | null;
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('p-2.5 rounded-xl w-fit', accent ? 'bg-champagne/20 text-champagne' : 'bg-charcoal text-text-tertiary')}>
          {icon}
        </div>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <p className="text-2xl font-semibold text-text-primary tabular-nums mt-3">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SalesPage() {
  const [data,          setData]          = React.useState<SalesData | null>(null);
  const [loading,       setLoading]       = React.useState(true);
  const [activePreset,  setActivePreset]  = React.useState(1); // 7 days
  const [showModal,     setShowModal]     = React.useState(false);
  const [recentSales,   setRecentSales]   = React.useState<BookingRecord[]>([]);
  const [recentLoading, setRecentLoading] = React.useState(false);

  // Build date range for a given preset.
  // Returns full ISO timestamps — NOT date-only strings.
  // Date-only strings become midnight UTC, creating a cutoff bug where
  // all bookings after midnight on 'to' day are excluded.
  function buildRange(days: number) {
    const to   = new Date();
    const from = days === 0
      ? new Date(new Date().setHours(0, 0, 0, 0))
      : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  const fetchData = React.useCallback(async (days: number) => {
    setLoading(true);
    try {
      const { from, to } = buildRange(days);
      const res  = await fetch(
        `/api/admin/sales?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      );
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentSales = React.useCallback(async (days: number) => {
    setRecentLoading(true);
    try {
      const { from, to } = buildRange(days);
      // Include both CONFIRMED and COMPLETED — a sale remains visible after it's completed
      const res  = await fetch(
        `/api/admin/bookings?status=CONFIRMED,COMPLETED&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&limit=50`,
      );
      const json = await res.json();
      if (json.success) setRecentSales(json.data?.items ?? []);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const refresh = React.useCallback(() => {
    fetchData(PRESETS[activePreset].days);
    fetchRecentSales(PRESETS[activePreset].days);
  }, [activePreset, fetchData, fetchRecentSales]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const maxSellerRev   = data?.leaderboard[0]?.revenue    ?? 1;
  const maxSpecRev     = data?.specialists[0]?.revenue     ?? 1;
  const maxProcRev     = data?.procedures[0]?.revenue      ?? 1;

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Продажи</h2>
          <p className="text-text-secondary mt-1 text-sm">Финансовая аналитика и рейтинг сотрудников</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm font-medium hover:bg-champagne/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Записать продажу
          </button>
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
          {/* ── Revenue KPI row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Выручка за период"
              value={formatCurrency(data?.totals.revenue ?? 0)}
              accent
              delta={data?.previousPeriod.revenueDelta ?? null}
            />
            <KpiCard
              icon={<ShoppingBag className="w-5 h-5" />}
              label="Записей за период"
              value={(data?.totals.count ?? 0).toLocaleString('ru-RU')}
              sub={`отменено: ${data?.totals.cancelledCount ?? 0}`}
              delta={data?.previousPeriod.countDelta ?? null}
            />
            <KpiCard
              icon={<Award className="w-5 h-5" />}
              label="Средний чек"
              value={data && data.totals.count > 0
                ? formatCurrency(data.totals.avgCheck)
                : '—'}
              sub="только завершённые"
            />
            <KpiCard
              icon={<Users className="w-5 h-5" />}
              label="Конверсия"
              value={`${data?.totals.completionRate ?? 0}%`}
              sub={`продавцов: ${data?.leaderboard.length ?? 0}`}
            />
          </div>

          {/* ── Client metrics row ───────────────────────────────────────── */}
          {data && (
            <div className="grid grid-cols-3 gap-4">
              <KpiCard
                icon={<Users className="w-5 h-5" />}
                label="Уникальных клиентов"
                value={(data.clientMetrics.totalUnique).toLocaleString('ru-RU')}
              />
              <KpiCard
                icon={<UserPlus className="w-5 h-5" />}
                label="Новые клиенты"
                value={data.clientMetrics.newClients.toLocaleString('ru-RU')}
              />
              <KpiCard
                icon={<Repeat className="w-5 h-5" />}
                label="Возвратные клиенты"
                value={data.clientMetrics.returningClients.toLocaleString('ru-RU')}
              />
            </div>
          )}

          {/* ── Revenue trend (AreaChart) ─────────────────────────────────── */}
          {data && data.daily.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-medium text-text-primary">Динамика выручки</h3>
                  <p className="text-xs text-text-tertiary mt-0.5">Подтверждённые и завершённые записи</p>
                </div>
                {data.previousPeriod.revenueDelta !== null && (
                  <div className="text-right">
                    <Delta value={data.previousPeriod.revenueDelta} />
                    <p className="text-[10px] text-text-tertiary mt-0.5">к предыдущему периоду</p>
                  </div>
                )}
              </div>
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#D4AF7A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D4AF7A" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#6A6560' }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6A6560' }}
                      axisLine={false} tickLine={false} width={44}
                      tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [formatCurrency(v), 'Выручка']}
                      labelStyle={{ color: '#9A9490', marginBottom: 4 }}
                    />
                    <Area
                      type="monotone" dataKey="revenue"
                      stroke="#D4AF7A" strokeWidth={2}
                      fill="url(#salesRevGrad)" dot={false}
                      activeDot={{ r: 4, fill: '#D4AF7A', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Daily bookings BarChart ───────────────────────────────────── */}
          {data && data.daily.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Записи по дням</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Количество подтверждённых записей</p>
              </div>
              <div className="p-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A38" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#6A6560' }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6A6560' }}
                      axisLine={false} tickLine={false} width={24}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [v, 'Записей']}
                      labelStyle={{ color: '#9A9490', marginBottom: 4 }}
                    />
                    <Bar dataKey="count" fill="#D4AF7A" radius={[3, 3, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Seller leaderboard ───────────────────────────────────────── */}
          <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Рейтинг продавцов</h3>
              <p className="text-xs text-text-tertiary mt-0.5">По атрибутированной выручке за период</p>
            </div>

            {!data?.leaderboard.length ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <TrendingUp className="w-10 h-10 text-text-tertiary" />
                <p className="text-sm text-text-secondary">Нет данных за выбранный период</p>
                <p className="text-xs text-text-tertiary">Назначьте продавца при записи</p>
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
                      {data.leaderboard.map((row, i) => (
                        <tr key={row.userId} className="hover:bg-charcoal/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <span className={cn('text-sm font-bold tabular-nums',
                              i === 0 ? 'text-champagne' : i === 1 ? 'text-text-secondary' : 'text-text-tertiary')}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={row.name} size="sm" />
                              <div>
                                <p className="font-medium text-text-primary">{row.name}</p>
                                <div className="mt-1 h-1.5 rounded-full bg-champagne/15 overflow-hidden" style={{ width: 100 }}>
                                  <div
                                    className="h-full rounded-full bg-champagne transition-all"
                                    style={{ width: `${Math.round((row.revenue / maxSellerRev) * 100)}%` }}
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
                  {data.leaderboard.map((row, i) => (
                    <div key={row.userId} className="px-4 py-4 flex items-start gap-3">
                      <span className={cn('text-lg font-bold tabular-nums w-6 text-right shrink-0 mt-1',
                        i === 0 ? 'text-champagne' : 'text-text-tertiary')}>
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

          {/* ── Specialist performance ────────────────────────────────────── */}
          {data && data.specialists.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Специалисты</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Выручка по специалисту, выполнившему услугу</p>
              </div>
              <div className="divide-y divide-border-luxury">
                {data.specialists.map((s, i) => (
                  <div key={s.specialistId} className="px-6 py-3.5">
                    <div className="flex items-center gap-4 mb-1.5">
                      <span className={cn('text-sm font-medium tabular-nums w-5 text-right shrink-0',
                        i === 0 ? 'text-champagne' : 'text-text-tertiary')}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-text-tertiary">Записей</p>
                          <p className="text-sm font-medium text-text-primary">{s.count}</p>
                        </div>
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-text-tertiary">Ср. чек</p>
                          <p className="text-sm font-medium text-text-primary">{formatCurrency(s.avg)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-text-tertiary">Выручка</p>
                          <p className="text-sm font-semibold text-champagne">{formatCurrency(s.revenue)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-9 h-1.5 rounded-full bg-charcoal overflow-hidden">
                      <div
                        className="h-full rounded-full bg-champagne/60 transition-all"
                        style={{ width: `${Math.round((s.revenue / maxSpecRev) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Procedure ranking ─────────────────────────────────────────── */}
          {data && data.procedures.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-luxury">
                <h3 className="font-serif text-lg font-medium text-text-primary">Топ процедур</h3>
                <p className="text-xs text-text-tertiary mt-0.5">По выручке за период</p>
              </div>
              <div className="divide-y divide-border-luxury">
                {data.procedures.map((p, i) => (
                  <div key={p.serviceId} className="px-6 py-3 flex items-center gap-4">
                    <span className={cn('text-sm font-medium tabular-nums w-5 text-right shrink-0',
                      i === 0 ? 'text-champagne' : 'text-text-tertiary')}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                      <div className="mt-1 h-1 rounded-full bg-charcoal overflow-hidden">
                        <div
                          className="h-full rounded-full bg-champagne/50 transition-all"
                          style={{ width: `${Math.round((p.revenue / maxProcRev) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="hidden sm:block">
                        <p className="text-xs text-text-tertiary">Продаж</p>
                        <p className="text-sm text-text-secondary">{p.count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-tertiary">Выручка</p>
                        <p className="text-sm font-semibold text-champagne tabular-nums">{formatCurrency(p.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Recent Sales — renders independently of analytics state ───────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Последние продажи</h3>
          <p className="text-xs text-text-tertiary mt-0.5">Подтверждённые и завершённые за период</p>
        </div>

        {recentLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
          </div>
        ) : recentSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <ShoppingBag className="w-8 h-8 text-text-tertiary" />
            <p className="text-sm text-text-secondary">Продаж за период нет</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Услуга</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Специалист</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Статус</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Дата</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-charcoal/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={sale.clientName} size="sm" />
                          <span className="font-medium text-text-primary">{sale.clientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary max-w-[180px] truncate">
                        {sale.services.map((s) => s.name).join(', ')}
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">{sale.specialistName}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                          sale.status === 'COMPLETED'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-champagne/10 text-champagne border-champagne/20',
                        )}>
                          {sale.status === 'COMPLETED' ? 'Завершено' : 'Подтверждено'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-text-tertiary text-xs">
                        {new Date(sale.startAt).toLocaleDateString('ru-RU', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold text-champagne tabular-nums">
                        {formatCurrency(sale.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-border-luxury">
              {recentSales.map((sale) => (
                <div key={sale.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Avatar name={sale.clientName} size="sm" />
                      <span className="text-sm font-medium text-text-primary">{sale.clientName}</span>
                    </div>
                    <span className="font-semibold text-champagne tabular-nums">{formatCurrency(sale.totalPrice)}</span>
                  </div>
                  <p className="text-xs text-text-tertiary ml-8">
                    {sale.services.map((s) => s.name).join(', ')} · {sale.specialistName}
                  </p>
                  <p className="text-[10px] text-text-tertiary ml-8 mt-0.5">
                    {new Date(sale.startAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <RecordSaleModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); refresh(); }}
        />
      )}
    </div>
  );
}
