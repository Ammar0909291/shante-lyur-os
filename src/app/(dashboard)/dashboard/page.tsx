'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, TrendingDown, AlertTriangle,
  Clock, Users, Zap, Activity, RefreshCw, Trophy,
  CalendarCheck, ShoppingBag, Percent, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatCurrency } from '@/lib/utils';
import { getClientRole } from '@/lib/client-auth';
import { useLanguage } from '@/contexts/language';
import type { TodayOperationsResponse, LiveSpecialist, OperationalAlert } from '@/types/operations';
import type { DashboardSummary } from '@/types/analytics';

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];
const TZ = 'Asia/Yekaterinburg';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, trend, accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: number; positive: boolean };
  accent?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-5 flex flex-col gap-3',
      accent
        ? 'bg-gradient-to-br from-champagne/10 to-champagne/5 border-champagne/30'
        : 'bg-onyx/60 border-border-luxury',
    )}>
      <div className="flex items-center justify-between">
        <div className={cn('p-2 rounded-lg', accent ? 'bg-champagne/15 text-champagne' : 'bg-charcoal/80 text-text-secondary')}>
          {icon}
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trend.positive ? 'text-green-400' : 'text-red-400')}>
            {trend.positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <p className={cn('text-2xl font-bold tracking-tight', accent ? 'text-champagne' : 'text-text-primary')}>{value}</p>
        <p className="text-xs text-text-tertiary mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-text-tertiary/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Timeline Heatmap ────────────────────────────────────────────────────────
function TimelineHeatmap({ queue, t }: { queue: TodayOperationsResponse['queue']; t: (k: string) => string }) {
  const currentHour = parseInt(new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }), 10);
  const hours = Array.from({ length: 13 }, (_, i) => i + 9); // 9–21
  const counts = hours.map((h) =>
    queue.filter((a) => {
      const startH = parseInt(new Date(a.startAt).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }), 10);
      return startH === h && !['CANCELLED', 'NO_SHOW'].includes(a.operationalStatus);
    }).length,
  );
  const max = Math.max(...counts, 1);

  return (
    <div>
      <div className="flex items-end gap-1 h-16">
        {hours.map((h, i) => {
          const isPast = h < currentHour;
          const isCurrent = h === currentHour;
          const height = Math.max((counts[i] / max) * 100, counts[i] > 0 ? 12 : 4);
          return (
            <div key={h} className="flex-1 flex flex-col items-center">
              <div
                className={cn(
                  'w-full rounded-sm transition-all duration-300',
                  isCurrent ? 'bg-champagne' : isPast ? 'bg-charcoal/80' : 'bg-champagne/30',
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {hours.map((h) => (
          <div key={h} className="flex-1 text-center text-[9px] text-text-tertiary/50">
            {h === currentHour ? <span className="text-champagne font-medium">{h}</span> : h % 3 === 0 ? h : ''}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        {[
          { cls: 'bg-champagne',    label: t('cmd.densityNow') },
          { cls: 'bg-champagne/30', label: t('cmd.densityUpcoming') },
          { cls: 'bg-charcoal/80',  label: t('cmd.densityPast') },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-text-tertiary">
            <span className={cn('w-2 h-2 rounded-sm inline-block', cls)} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Specialist Leaderboard ──────────────────────────────────────────────────
function SpecialistLeaderboard({ specialists, t }: { specialists: LiveSpecialist[]; t: (k: string) => string }) {
  const sorted = [...specialists]
    .filter((s) => s.todayScheduled > 0)
    .sort((a, b) => b.todayCompleted - a.todayCompleted)
    .slice(0, 5);

  if (sorted.length === 0) return (
    <p className="text-xs text-text-tertiary py-4 text-center">{t('cmd.noActivity')}</p>
  );

  const medals = ['🥇', '🥈', '🥉', '4', '5'];

  return (
    <div className="space-y-2">
      {sorted.map((s, i) => {
        const pct = s.todayScheduled > 0 ? Math.round((s.todayCompleted / s.todayScheduled) * 100) : 0;
        const isBusy = s.liveStatus === 'BUSY' || s.liveStatus === 'OVERBOOKED';
        return (
          <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-charcoal/30 hover:bg-charcoal/50 transition-colors">
            <span className="text-base w-5 text-center shrink-0 text-text-tertiary text-xs">{medals[i]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                {isBusy && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1 bg-charcoal/80 rounded-full overflow-hidden">
                  <div className="h-full bg-champagne/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-text-tertiary shrink-0">{s.todayCompleted}/{s.todayScheduled}</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-champagne shrink-0">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Alert Strip ─────────────────────────────────────────────────────────────
function AlertStrip({ alerts }: { alerts: OperationalAlert[] }) {
  const hasCritical = alerts.some((a) => a.severity === 'critical');
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 flex items-start gap-3',
      hasCritical ? 'bg-red-950/30 border-red-500/30' : 'bg-amber-950/30 border-amber-500/30',
    )}>
      <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', hasCritical ? 'text-red-400' : 'text-amber-400')} />
      <div className="flex-1 min-w-0 space-y-1">
        {alerts.slice(0, 3).map((a) => (
          <p key={a.id} className="text-xs text-text-secondary">{a.message}</p>
        ))}
        {alerts.length > 3 && <p className="text-[10px] text-text-tertiary">+{alerts.length - 3}</p>}
      </div>
      <Link href="/operations" className="shrink-0 text-xs text-champagne hover:text-champagne/80 flex items-center gap-1">
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Next Up Panel ───────────────────────────────────────────────────────────
function NextUpPanel({ queue, t }: { queue: TodayOperationsResponse['queue']; t: (k: string) => string }) {
  const now = new Date().toISOString();
  const upcoming = queue
    .filter((a) => !['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(a.operationalStatus) && a.startAt >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 4);

  if (upcoming.length === 0) return <p className="text-xs text-text-tertiary py-4 text-center">{t('cmd.noUpcoming')}</p>;

  const STATUS_COLOR: Record<string, string> = {
    PENDING: 'bg-blue-400', CONFIRMED: 'bg-champagne',
    ARRIVED: 'bg-teal-400', WAITING: 'bg-amber-400', IN_PROGRESS: 'bg-violet-400',
  };

  return (
    <div className="space-y-2">
      {upcoming.map((a) => (
        <div key={a.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-charcoal/30">
          <span className={cn('w-1.5 h-8 rounded-full shrink-0', STATUS_COLOR[a.operationalStatus] ?? 'bg-zinc-500')} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{a.clientName}</p>
            <p className="text-[11px] text-text-tertiary truncate">{a.services[0]} · {a.specialistName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-mono font-semibold text-text-secondary">{fmtTime(a.startAt)}</p>
            <p className="text-[10px] text-text-tertiary">{a.duration}м</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router    = useRouter();
  const { t, lang } = useLanguage();
  const role      = getClientRole();

  const [ops,     setOps]     = React.useState<TodayOperationsResponse | null>(null);
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date());
  const [refreshing, setRefreshing]   = React.useState(false);

  React.useEffect(() => {
    if (SPECIALIST_ROLES.includes(role)) router.replace('/my-panel');
  }, [role, router]);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [opsRes, sumRes] = await Promise.all([
        fetch('/api/operations/today', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/analytics/dashboard/summary', { cache: 'no-store' }).then((r) => r.json()),
      ]);
      if (opsRes.success) setOps(opsRes.data as TodayOperationsResponse);
      if (sumRes.success) setSummary(sumRes.data as DashboardSummary);
      setLastRefresh(new Date());
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => {
    const id = setInterval(() => void load(true), 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (SPECIALIST_ROLES.includes(role)) return null;

  const now    = new Date();
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const dateStr = now.toLocaleDateString(locale, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

  const m          = ops?.metrics;
  const total      = m?.totalBookings ?? 0;
  const completed  = m?.completed     ?? 0;
  const inProgress = m?.inProgress    ?? 0;
  const noShows    = m?.noShow        ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // SALES = totalPrice (gross amount clients pay) — NOT net revenue
  const salesToday = summary?.revenue.today     ?? 0;
  const salesWeek  = summary?.revenue.thisWeek.total ?? 0;
  const salesCosm  = summary?.revenue.thisWeek.byType.cosmetology ?? 0;
  const salesMass  = summary?.revenue.thisWeek.byType.massage      ?? 0;
  const salesTrend = summary?.revenue.trend.vsLastWeek;

  const workingNow = ops?.specialists.filter((s) => s.liveStatus !== 'OFFLINE').length ?? 0;

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        <p className="text-xs text-text-tertiary">{t('cmd.loading')}</p>
      </div>
    </div>
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-text-primary">{t('cmd.title')}</h1>
          <p className="text-sm text-text-tertiary mt-0.5 capitalize">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary bg-charcoal/50 rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">{timeStr}</span>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal/50 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {ops?.alerts && ops.alerts.length > 0 && <AlertStrip alerts={ops.alerts} />}

      {/* ── KPI Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          accent
          icon={<ShoppingBag className="w-4 h-4" />}
          label={t('cmd.salesToday')}
          value={formatCurrency(salesToday)}
          trend={salesTrend !== undefined && salesTrend !== 0
            ? { value: Math.abs(Math.round(salesTrend)), positive: salesTrend >= 0 }
            : undefined}
        />
        <KpiCard
          icon={<CalendarCheck className="w-4 h-4" />}
          label={t('cmd.sessionsToday')}
          value={total}
          sub={t('cmd.sessionsDone').replace('{done}', String(completed)).replace('{active}', String(inProgress))}
        />
        <KpiCard
          icon={<Percent className="w-4 h-4" />}
          label={t('cmd.completionRate')}
          value={`${completionRate}%`}
          sub={noShows > 0
            ? t('cmd.noShows').replace('{n}', String(noShows))
            : t('cmd.noNoShows')}
        />
        <KpiCard
          icon={<Users className="w-4 h-4" />}
          label={t('cmd.specialistsOnFloor')}
          value={workingNow}
          sub={t('cmd.ofScheduled').replace('{n}', String(ops?.specialists.length ?? 0))}
        />
      </div>

      {/* ── Leaderboard + Next Up ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border-luxury bg-onyx/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-champagne" />
              <h2 className="text-sm font-semibold text-text-primary">{t('cmd.leaders')}</h2>
            </div>
            <span className="text-[10px] text-text-tertiary">{t('cmd.leadersSub')}</span>
          </div>
          <div className="p-4">
            <SpecialistLeaderboard specialists={ops?.specialists ?? []} t={t} />
          </div>
        </div>

        <div className="rounded-2xl border border-border-luxury bg-onyx/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-champagne" />
              <h2 className="text-sm font-semibold text-text-primary">{t('cmd.comingUp')}</h2>
            </div>
            <Link href="/operations" className="text-[10px] text-champagne hover:text-champagne/80 flex items-center gap-1">
              {t('cmd.fullBoard')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            <NextUpPanel queue={ops?.queue ?? []} t={t} />
          </div>
        </div>
      </div>

      {/* ── Timeline heatmap ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border-luxury bg-onyx/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border-luxury flex items-center gap-2">
          <Activity className="w-4 h-4 text-champagne" />
          <h2 className="text-sm font-semibold text-text-primary">{t('cmd.density')}</h2>
        </div>
        <div className="px-5 py-4">
          <TimelineHeatmap queue={ops?.queue ?? []} t={t} />
        </div>
      </div>

      {/* ── Rooms + Weekly Sales ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="rounded-2xl border border-border-luxury bg-onyx/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury flex items-center gap-2">
            <Clock className="w-4 h-4 text-champagne" />
            <h2 className="text-sm font-semibold text-text-primary">{t('cmd.rooms')}</h2>
          </div>
          <div className="p-4 space-y-2">
            {(ops?.rooms ?? []).length === 0 && (
              <p className="text-xs text-text-tertiary text-center py-3">{t('cmd.noRooms')}</p>
            )}
            {(ops?.rooms ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm text-text-primary truncate">{r.name}</p>
                  {r.isOccupied && r.currentAppointment && (
                    <p className="text-[10px] text-text-tertiary truncate">{r.currentAppointment.clientName}</p>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
                  r.isOccupied ? 'bg-violet-900/40 text-violet-300' : 'bg-green-900/40 text-green-300',
                )}>
                  {r.isOccupied ? t('cmd.occupied') : t('cmd.free')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border-luxury bg-onyx/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-champagne" />
            <h2 className="text-sm font-semibold text-text-primary">{t('cmd.thisWeek')}</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">{t('cmd.totalSales')}</p>
              <p className="text-3xl font-bold text-champagne">{formatCurrency(salesWeek)}</p>
              {salesTrend !== undefined && salesTrend !== 0 && (
                <p className={cn('text-xs mt-1 flex items-center gap-1', salesTrend >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {salesTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(Math.round(salesTrend))}% {t('cmd.vsLastWeek')}
                </p>
              )}
            </div>
            <div className="space-y-3">
              {[
                { label: t('cmd.cosmetology'), value: salesCosm, cls: 'bg-champagne' },
                { label: t('cmd.massage'),     value: salesMass, cls: 'bg-blue-400' },
              ].map(({ label, value, cls }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] text-text-tertiary mb-1">
                    <span>{label}</span><span>{formatCurrency(value)}</span>
                  </div>
                  <div className="h-1.5 bg-charcoal/80 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', cls)}
                      style={{ width: salesWeek > 0 ? `${(value / salesWeek) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border-luxury px-5 py-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: t('cmd.completed'), value: completed,                                                       color: 'text-green-400' },
              { label: t('cmd.active'),    value: (m?.pending ?? 0) + (m?.confirmed ?? 0) + inProgress,           color: 'text-champagne' },
              { label: t('cmd.noShow'),    value: noShows,                                                         color: 'text-red-400' },
              { label: t('cmd.cancelled'), value: m?.cancelled ?? 0,                                               color: 'text-text-tertiary' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className={cn('text-lg font-bold font-mono', color)}>{value}</p>
                <p className="text-[10px] text-text-tertiary">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[10px] text-text-tertiary/50 pt-1 pb-4">
        <span>{t('cmd.autoRefresh')}</span>
        <span>{t('cmd.lastUpdated')} {lastRefresh.toLocaleTimeString(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>

    </div>
  );
}
