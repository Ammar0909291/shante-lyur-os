'use client';

import * as React from 'react';
import {
  Clock, CheckCircle2, AlertTriangle, User, Wifi, WifiOff,
  CalendarCheck, ChevronRight, Activity, Loader2, RefreshCw,
} from 'lucide-react';
import { cn, formatTime, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Allergy {
  allergen: string;
  severity: string;
}

interface ServiceItem {
  id: string;
  name: string;
  category: string;
}

interface ClientInfo {
  id: string;
  name: string;
  phone: string | null;
  loyaltyTier: string | null;
  totalVisits: number;
  notes: string | null;
  allergies: Allergy[];
}

interface AppointmentSlot {
  id: string;
  dbStatus: string;
  operationalStatus: string;
  startAt: string;
  endAt: string;
  duration: number;
  revenue: number;
  notes: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  roomId: string | null;
  roomName: string | null;
  roomType: string | null;
  waitMinutes: number | null;
  progressPct: number | null;
  client: ClientInfo;
  services: ServiceItem[];
}

interface ScheduleData {
  specialist: { id: string; name: string; specialization: string | null };
  date: string;
  queue: AppointmentSlot[];
  currentAppointment: AppointmentSlot | null;
  nextAppointment: AppointmentSlot | null;
  arrivedWaiting: AppointmentSlot[];
  completedToday: number;
  totalToday: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  try {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (!match) return {};
    const payload = JSON.parse(
      atob(match[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as { sub?: string; role?: string };
    return { 'x-user-id': payload.sub ?? '', 'x-user-role': payload.role ?? '' };
  } catch {
    return {};
  }
}

function fmtTime(iso: string) {
  return formatTime(new Date(iso));
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: 'text-amber-600 bg-amber-600/10',
  SILVER: 'text-slate-400 bg-slate-400/10',
  GOLD: 'text-champagne bg-champagne/10',
  PLATINUM: 'text-cyan-400 bg-cyan-400/10',
  VIP: 'text-purple-400 bg-purple-400/10',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  PENDING: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  ARRIVED: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  WAITING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  IN_PROGRESS: 'text-champagne bg-champagne/10 border-champagne/20',
  COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveBadge({ connected }: { connected: boolean }) {
  const { t } = useLanguage();
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider',
        connected ? 'text-green-400 bg-green-400/10' : 'text-text-tertiary bg-charcoal',
      )}
    >
      {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {t('panel.liveUpdates')}
    </span>
  );
}

function LoyaltyBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  return (
    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider', TIER_COLORS[tier] ?? 'text-text-tertiary bg-charcoal')}>
      {tier}
    </span>
  );
}

function AllergyWarning({ allergies }: { allergies: Allergy[] }) {
  const { t } = useLanguage();
  if (allergies.length === 0) return null;
  return (
    <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
      <div>
        <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">{t('panel.allergies')}: </span>
        <span className="text-xs text-red-300">
          {allergies.map((a) => `${a.allergen}${a.severity !== 'MILD' ? ` (${a.severity})` : ''}`).join(', ')}
        </span>
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  loading,
  variant = 'default',
  disabled,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  disabled?: boolean;
}) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-50';
  const variants = {
    default: 'bg-charcoal text-text-secondary hover:text-text-primary hover:bg-white/8 border border-border-luxury',
    primary: 'bg-champagne/15 text-champagne hover:bg-champagne/25 border border-champagne/30',
    success: 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(base, variants[variant])}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </button>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-charcoal rounded-full overflow-hidden mt-2">
      <div
        className="h-full bg-champagne rounded-full transition-all duration-1000"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ClientCard({ client, compact = false }: { client: ClientInfo; compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className={cn('flex flex-col gap-1', compact && 'text-sm')}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-text-primary">{client.name}</span>
        <LoyaltyBadge tier={client.loyaltyTier} />
        <span className="text-[10px] text-text-tertiary">{client.totalVisits} {t('panel.visits')}</span>
      </div>
      {client.phone && <span className="text-xs text-text-tertiary">{client.phone}</span>}
      {client.notes && !compact && (
        <p className="text-xs text-text-secondary italic mt-1">{client.notes}</p>
      )}
      {!compact && <AllergyWarning allergies={client.allergies} />}
    </div>
  );
}

// ─── Active Procedure Card ─────────────────────────────────────────────────────

function ActiveCard({
  apt,
  onComplete,
  loading,
}: {
  apt: AppointmentSlot;
  onComplete: (id: string) => void;
  loading: boolean;
}) {
  const { t } = useLanguage();
  const pct = apt.progressPct ?? 0;

  return (
    <div className="rounded-2xl border border-champagne/25 bg-champagne/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-champagne animate-pulse" />
          <span className="text-xs font-semibold text-champagne uppercase tracking-wider">{t('panel.progress')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Clock className="w-3.5 h-3.5" />
          {fmtTime(apt.startAt)} – {fmtTime(apt.endAt)}
        </div>
      </div>

      <ClientCard client={apt.client} />

      <div>
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>{apt.services.map((s) => s.name).join(', ')}</span>
          <span>{pct}%</span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {apt.roomName && (
        <div className="text-[10px] text-text-tertiary">{t('panel.room')}: {apt.roomName}</div>
      )}

      <div className="flex justify-end pt-1">
        <ActionBtn
          label={t('panel.complete')}
          variant="success"
          loading={loading}
          onClick={() => onComplete(apt.id)}
        />
      </div>
    </div>
  );
}

// ─── Arrived / Waiting Card ───────────────────────────────────────────────────

function ArrivedCard({ apt, onStart, loading }: { apt: AppointmentSlot; onStart: (id: string) => void; loading: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border border-teal-400/25 bg-teal-400/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">{t('panel.arrived')}</span>
        {apt.waitMinutes !== null && apt.waitMinutes > 0 && (
          <span className="text-[10px] text-amber-400">{t('panel.wait')} {apt.waitMinutes} мин</span>
        )}
      </div>
      <ClientCard client={apt.client} compact />
      <div className="text-xs text-text-secondary">{apt.services.map((s) => s.name).join(', ')}</div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-tertiary">{fmtTime(apt.startAt)}</span>
        <ActionBtn label={t('panel.start')} variant="primary" loading={loading} onClick={() => onStart(apt.id)} />
      </div>
    </div>
  );
}

// ─── Next Client Card ─────────────────────────────────────────────────────────

function NextCard({ apt }: { apt: AppointmentSlot }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border border-border-luxury bg-charcoal/40 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">{t('panel.next')}</span>
        <span className="text-[10px] text-champagne font-medium ml-auto">{fmtTime(apt.startAt)}</span>
      </div>
      <ClientCard client={apt.client} compact />
      <div className="text-xs text-text-secondary">{apt.services.map((s) => s.name).join(', ')}</div>
      {apt.client.allergies.length > 0 && <AllergyWarning allergies={apt.client.allergies} />}
    </div>
  );
}

// ─── Timeline row ─────────────────────────────────────────────────────────────

function TimelineRow({ apt }: { apt: AppointmentSlot }) {
  const statusCls = STATUS_COLORS[apt.operationalStatus] ?? STATUS_COLORS['CONFIRMED'];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-luxury/30 last:border-0">
      <div className="w-14 shrink-0 text-right">
        <span className="text-xs font-medium text-text-secondary">{fmtTime(apt.startAt)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary truncate">{apt.client.name}</span>
          <LoyaltyBadge tier={apt.client.loyaltyTier} />
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider', statusCls)}>
            {apt.operationalStatus}
          </span>
        </div>
        <div className="text-xs text-text-secondary mt-0.5 truncate">
          {apt.services.map((s) => s.name).join(', ')}
        </div>
        {apt.roomName && (
          <div className="text-[10px] text-text-tertiary mt-0.5">{apt.roomName}</div>
        )}
        {apt.client.allergies.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[10px] text-red-400">
              {apt.client.allergies.map((a) => a.allergen).join(', ')}
            </span>
          </div>
        )}
      </div>
      <div className="text-[10px] text-text-tertiary shrink-0">{apt.duration}м</div>
    </div>
  );
}

// ─── Performance Stats ────────────────────────────────────────────────────────

interface PerfStats {
  totalSessions: number;
  revenueGenerated: number;
  workloadCompliance: number | null;
  clientRetentionRate: number;
  trendVsLastMonth: number;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-luxury bg-charcoal/30 p-3">
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

function PerformanceSection({ specialistId, headers }: { specialistId: string; headers: Record<string, string> }) {
  const { t } = useLanguage();
  const [perf, setPerf] = React.useState<PerfStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const from = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0];
    const to   = new Date().toISOString().split('T')[0];
    void fetch(`/api/analytics/specialists/${specialistId}/performance?from=${from}&to=${to}`, { headers })
      .then((r) => r.json())
      .then((j: { success: boolean; data?: { totalSessions?: number; revenueGenerated?: number; workloadCompliance?: number | null; clientRetentionRate?: number; trendVsLastMonth?: number } }) => {
        if (j.success && j.data) {
          setPerf({
            totalSessions:       j.data.totalSessions ?? 0,
            revenueGenerated:    j.data.revenueGenerated ?? 0,
            workloadCompliance:  j.data.workloadCompliance ?? null,
            clientRetentionRate: j.data.clientRetentionRate ?? 0,
            trendVsLastMonth:    j.data.trendVsLastMonth ?? 0,
          });
        }
      })
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false));
  }, [specialistId, headers]);

  return (
    <div className="rounded-2xl border border-border-luxury bg-onyx/50">
      <div className="px-4 py-3 border-b border-border-luxury flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-champagne" />
        <h3 className="text-sm font-semibold text-text-primary">{t('myPanel.stats.title')}</h3>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border-luxury bg-charcoal/30 p-3 h-16 animate-pulse" />
            ))}
          </div>
        ) : perf ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatChip label={t('myPanel.stats.completed')} value={String(perf.totalSessions)} />
              <StatChip label={t('myPanel.stats.revenue')} value={formatCurrency(perf.revenueGenerated)} />
              {perf.workloadCompliance !== null && (
                <StatChip label={t('myPanel.stats.utilization')} value={`${perf.workloadCompliance}%`} />
              )}
              <StatChip label={t('myPanel.stats.cancelRate')} value={`${perf.clientRetentionRate}%`} />
              {perf.trendVsLastMonth !== 0 && (
                <div className="rounded-xl border border-border-luxury bg-charcoal/30 p-3">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Тренд</p>
                  <p className={cn('text-lg font-semibold tabular-nums', perf.trendVsLastMonth > 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {perf.trendVsLastMonth > 0 ? '+' : ''}{perf.trendVsLastMonth}%
                  </p>
                </div>
              )}
            </div>
            <p className="text-[10px] text-text-tertiary mt-3">{t('myPanel.stats.period')}</p>
          </>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-4">—</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyPanelPage() {
  const { t } = useLanguage();
  const [data, setData] = React.useState<ScheduleData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [liveConnected, setLiveConnected] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchSchedule = React.useCallback(async () => {
    const headers = getAuthHeaders();
    try {
      const res = await fetch('/api/operations/my-schedule', { headers });
      const json = await res.json();
      if (json.success) {
        setData(json.data as ScheduleData);
        setError(null);
      } else {
        setError(json.error?.message ?? 'Error');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  // SSE for live updates
  React.useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers['x-user-id']) return;
    const es = new EventSource('/api/realtime/ops-stream');
    es.onopen = () => setLiveConnected(true);
    es.onerror = () => setLiveConnected(false);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type?: string };
        if (ev.type === 'connected') { setLiveConnected(true); return; }
        // Any ops event may affect specialist's schedule — refresh
        void fetchSchedule();
      } catch {}
    };
    return () => { es.close(); setLiveConnected(false); };
  }, [fetchSchedule]);

  const doTransition = React.useCallback(async (id: string, action: string) => {
    setActionLoading(id + action);
    try {
      const headers = getAuthHeaders();
      await fetch(`/api/operations/appointments/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action }),
      });
      await fetchSchedule();
    } finally {
      setActionLoading(null);
    }
  }, [fetchSchedule]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{t('panel.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-text-secondary text-sm">{error}</p>
        <button
          onClick={() => { setLoading(true); void fetchSchedule(); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-charcoal text-text-secondary hover:text-text-primary border border-border-luxury transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('panel.refresh')}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { specialist, queue, currentAppointment, nextAppointment, arrivedWaiting, completedToday, totalToday } = data;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-champagne" />
            <h2 className="font-serif text-2xl font-medium text-text-primary">{specialist.name}</h2>
          </div>
          {specialist.specialization && (
            <p className="text-sm text-text-tertiary mt-0.5">{specialist.specialization}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge connected={liveConnected} />
          <button
            onClick={() => { setLoading(true); void fetchSchedule(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-charcoal text-text-secondary hover:text-text-primary border border-border-luxury transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('panel.refresh')}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('panel.total'), value: totalToday, icon: CalendarCheck, color: 'text-champagne' },
          { label: t('panel.done'), value: completedToday, icon: CheckCircle2, color: 'text-green-400' },
          { label: t('panel.arrived'), value: arrivedWaiting.length, icon: User, color: 'text-teal-400' },
          { label: t('panel.progress'), value: currentAppointment ? 1 : 0, icon: Activity, color: 'text-champagne' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border-luxury bg-charcoal/30 p-3 flex items-center gap-3">
            <Icon className={cn('w-5 h-5 shrink-0', color)} />
            <div>
              <p className="text-xl font-bold text-text-primary">{value}</p>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: active + arrived + next */}
        <div className="lg:col-span-1 space-y-4">
          {/* Active procedure */}
          {currentAppointment ? (
            <ActiveCard
              apt={currentAppointment}
              onComplete={(id) => doTransition(id, 'complete')}
              loading={actionLoading === currentAppointment.id + 'complete'}
            />
          ) : (
            <div className="rounded-2xl border border-border-luxury bg-charcoal/20 p-4 text-center">
              <Activity className="w-8 h-8 text-text-tertiary/30 mx-auto mb-2" />
              <p className="text-sm text-text-tertiary">{t('panel.noArrived')}</p>
            </div>
          )}

          {/* Arrived/Waiting */}
          {arrivedWaiting.length > 0 && (
            <div className="space-y-2">
              {arrivedWaiting
                .filter((a) => a.id !== currentAppointment?.id)
                .map((apt) => (
                  <ArrivedCard
                    key={apt.id}
                    apt={apt}
                    onStart={(id) => doTransition(id, 'start')}
                    loading={actionLoading === apt.id + 'start'}
                  />
                ))}
            </div>
          )}

          {/* Next client */}
          {nextAppointment && nextAppointment.id !== currentAppointment?.id && (
            <NextCard apt={nextAppointment} />
          )}
        </div>

        {/* Right: full timeline + performance stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border-luxury bg-onyx/50">
            <div className="px-4 py-3 border-b border-border-luxury flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">{t('panel.title')}</h3>
              <span className="text-xs text-text-tertiary">{data.date}</span>
            </div>
            <div className="p-4">
              {queue.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarCheck className="w-10 h-10 text-text-tertiary/30 mx-auto mb-3" />
                  <p className="text-sm text-text-tertiary">{t('panel.noSchedule')}</p>
                </div>
              ) : (
                <div>
                  {queue.map((apt) => (
                    <TimelineRow key={apt.id} apt={apt} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <PerformanceSection specialistId={specialist.id} headers={getAuthHeaders()} />
        </div>
      </div>
    </div>
  );
}
