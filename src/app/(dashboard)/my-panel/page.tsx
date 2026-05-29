'use client';

import * as React from 'react';
import {
  Calendar, Clock, AlertTriangle, User,
  Activity, Loader2, RefreshCw, TrendingUp,
  BarChart2, FileText, UserCircle, Send, Plus, X, Check,
  Phone, Leaf, ChevronRight,
} from 'lucide-react';
import { cn, formatTime, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

// ─── Auth helper ──────────────────────────────────────────────────────────────

function fmtTime(iso: string) { return formatTime(new Date(iso)); }

// ─── Types ────────────────────────────────────────────────────────────────────

interface Allergy { name: string; severity: string; }

interface TodaySlot {
  id: string;
  clientId: string;
  status: string;
  startAt: string;
  endAt: string;
  notes: string | null;
  room: { name: string; type: string } | null;
  client: { displayName: string; isVip: boolean; serviceNotes: string | null; allergies: Allergy[] };
  services: { name: string; duration: number; price: number }[];
}

interface WorkloadData { target: number; completed: number; remaining: number; }

interface TodayData {
  slots: TodaySlot[];
  workload: WorkloadData | null;
  specialistId: string;
}

interface ScheduleSlot {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  room: string | null;
  client: { displayName: string };
  services: { name: string; duration: number }[];
}

interface PerfData {
  month: {
    proceduresDone: number;
    totalSales: number;
    totalCommission: number;
    commissionPending: number;
    commissionApproved: number;
    firstTimePurchased: number;
    firstTimeNoPurchase: number;
    workingDays: number;
  };
  period: { year: number; month: number };
}

interface ProfileData {
  id: string;
  displayName: string | null;
  specialization: string | null;
  languagePreference: string;
  department: string;
  hiredAt: string | null;
  vipPermission: boolean;
  user: { firstName: string; lastName: string; email: string; phone: string | null };
  services: { id: string; name: string; baseDuration: number }[];
  workingSchedules: { dayOfWeek: string; startTime: string; endTime: string }[];
  rooms: { id: string; name: string; type: string }[];
}

interface RequestItem {
  id: string;
  type: 'leave' | 'schedule' | 'service';
  status: string;
  createdAt: string;
  date?: string;
  reason?: string | null;
  description?: string | null;
  serviceName?: string | null;
  note?: string | null;
  reviewNotes?: string | null;
}

interface ClientCardData {
  id: string; name: string; phone: string | null;
  allergies: { name: string; severity: string; reaction: string | null }[];
  restrictions: { type: string; description: string | null; severity: string }[];
  skinType: string | null; bodyType: string | null; notes: string | null;
  recentVisits: { id: string; date: string; services: string[]; total: number; appointmentNotes: string | null }[];
  specialistNotes: { id: string; type: string; content: string; date: string }[];
}

// ─── Client card modal ────────────────────────────────────────────────────────

function ClientCardModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { t } = useLanguage();
  const [data, setData] = React.useState<ClientCardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/specialist/portal/client/${clientId}`)
      .then((r) => r.json())
      .then((j: { success: boolean; data?: ClientCardData }) => { if (j.success && j.data) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const SEVERITY_COLORS: Record<string, string> = {
    mild: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    moderate: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    severe: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-onyx border border-border-luxury rounded-t-2xl sm:rounded-2xl shadow-luxury-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-luxury shrink-0">
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-champagne" />
            <span className="text-sm font-semibold text-text-primary">{data?.name ?? t('portal.client.name')}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-text-tertiary">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-text-secondary">{t('portal.client.noData')}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Contact */}
            {data.phone && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                <span>{data.phone}</span>
              </div>
            )}

            {/* Allergies */}
            {data.allergies.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">{t('portal.client.allergies')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.allergies.map((a, i) => (
                    <span key={i} className={cn('text-[10px] px-2 py-0.5 rounded border font-medium', SEVERITY_COLORS[a.severity.toLowerCase()] ?? SEVERITY_COLORS.mild)}>
                      {a.name}{a.reaction ? ` — ${a.reaction}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Restrictions */}
            {data.restrictions.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{t('portal.client.restrictions')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.restrictions.map((r, i) => (
                    <span key={i} className="text-[10px] text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                      {r.type}{r.description ? `: ${r.description}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Profile notes */}
            {(data.skinType || data.bodyType || data.notes) && (
              <div className="rounded-xl border border-border-luxury bg-charcoal/20 p-3 space-y-1.5">
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{t('portal.client.profile')}</span>
                {data.skinType && <p className="text-xs text-text-secondary">{t('portal.client.skinType')}: {data.skinType}</p>}
                {data.bodyType && <p className="text-xs text-text-secondary">{t('portal.client.bodyType')}: {data.bodyType}</p>}
                {data.notes && <p className="text-xs text-text-secondary italic">{data.notes}</p>}
              </div>
            )}

            {/* Recent visits */}
            {data.recentVisits.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{t('portal.client.recentVisits')}</span>
                {data.recentVisits.slice(0, 5).map((v) => (
                  <div key={v.id} className="rounded-lg border border-border-luxury/50 bg-charcoal/20 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{new Date(v.date).toLocaleDateString('ru-RU')}</span>
                      <span className="text-xs font-medium text-text-primary">{v.total.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{v.services.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Specialist notes */}
            {data.specialistNotes.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{t('portal.client.myNotes')}</span>
                {data.specialistNotes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border-luxury/50 bg-charcoal/20 px-3 py-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-champagne uppercase">{n.type}</span>
                      <span className="text-[10px] text-text-tertiary">{new Date(n.date).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{n.content}</p>
                  </div>
                ))}
              </div>
            )}

            {data.allergies.length === 0 && data.recentVisits.length === 0 && data.specialistNotes.length === 0 && (
              <p className="text-sm text-text-tertiary text-center py-4">{t('portal.client.noExtraData')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status colors ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'text-slate-400 bg-slate-400/10 border-slate-400/20',
  CONFIRMED:   'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ARRIVED:     'text-teal-400 bg-teal-400/10 border-teal-400/20',
  WAITING:     'text-amber-400 bg-amber-400/10 border-amber-400/20',
  IN_PROGRESS: 'text-champagne bg-champagne/10 border-champagne/20',
  COMPLETED:   'text-green-400 bg-green-400/10 border-green-400/20',
  CANCELLED:   'text-slate-500 bg-slate-500/10 border-slate-500/20',
  NO_SHOW:     'text-red-400 bg-red-400/10 border-red-400/20',
};

const REQ_STATUS_COLORS: Record<string, string> = {
  PENDING:  'text-amber-400 bg-amber-400/10',
  APPROVED: 'text-green-400 bg-green-400/10',
  REJECTED: 'text-red-400 bg-red-400/10',
};


function ScheduleCalendar() {
  const { t, lang } = useLanguage();
  const now = new Date();
  const [year,  setYear]  = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());
  const [workDays, setWorkDays] = React.useState<Set<string>>(new Set());
  const [loading, setLoading]   = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const to   = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    fetch(`/api/v1/my/working-days?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((j: { success: boolean; data?: { days: { date: string; isWorkDay: boolean }[] } }) => {
        if (j.success && j.data) {
          setWorkDays(new Set(j.data.days.filter((d) => d.isWorkDay).map((d) => d.date)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();
  const blanks      = firstDow === 0 ? 6 : firstDow - 1;
  const todayStr    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-champagne">{new Date(year, month).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { month: 'long' })} {year}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-text-tertiary">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d       = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isWork  = workDays.has(dateStr);
            const isToday = dateStr === todayStr;
            const cls = [
              'h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-colors',
              isWork  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/30'
                      : 'bg-charcoal/40 text-text-tertiary',
              isToday ? 'ring-2 ring-amber-400' : '',
            ].join(' ');
            return <div key={d} className={cls}>{d}</div>;
          })}
        </div>
      )}

      <div className="mt-3 flex gap-4 text-[11px] text-text-tertiary">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-900/40 border border-emerald-700/30 inline-block" />{t('portal.schedule.workDay')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-charcoal/40 inline-block" />{t('portal.schedule.dayOff')}</span>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border-luxury bg-charcoal/30 p-3">
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

function ActionBtn({
  label, onClick, loading, variant = 'default', disabled,
}: {
  label: string; onClick: () => void; loading?: boolean;
  variant?: 'default' | 'primary' | 'success'; disabled?: boolean;
}) {
  const V = {
    default: 'bg-charcoal text-text-secondary hover:text-text-primary border border-border-luxury',
    primary: 'bg-champagne/15 text-champagne hover:bg-champagne/25 border border-champagne/30',
    success: 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50', V[variant])}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </button>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function WorkloadBar({ workload, t }: { workload: WorkloadData; t: (k: string) => string }) {
  const pct = Math.min(100, Math.round((workload.completed / workload.target) * 100));
  const barColor = pct >= 100 ? 'bg-green-400' : pct >= 60 ? 'bg-champagne' : 'bg-amber-400';
  return (
    <div className="rounded-xl border border-border-luxury bg-onyx/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-champagne" />
          <span className="text-sm font-semibold text-text-primary">{t('portal.today.workload')}</span>
        </div>
        <span className="text-sm font-bold text-text-primary tabular-nums">
          {workload.completed} / {workload.target}
        </span>
      </div>
      <div className="w-full h-2 bg-charcoal rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-text-tertiary mt-2">
        {workload.remaining > 0
          ? `${t('portal.today.remaining')}: ${workload.remaining}`
          : t('portal.today.targetMet')}
      </p>
    </div>
  );
}

function TodaySlotCard({
  slot, onAction, actionLoading, onClientClick,
}: {
  slot: TodaySlot;
  onAction: (id: string, action: string) => void;
  actionLoading: string | null;
  onClientClick: (clientId: string) => void;
}) {
  const { t } = useLanguage();
  const isActive = slot.status === 'IN_PROGRESS';
  const canStart = ['ARRIVED', 'WAITING'].includes(slot.status);
  const canComplete = slot.status === 'IN_PROGRESS';
  const statusCls = STATUS_COLORS[slot.status] ?? STATUS_COLORS['PENDING'];
  const totalDuration = slot.services.reduce((s, svc) => s + svc.duration, 0);

  return (
    <div className={cn(
      'rounded-xl border p-3 space-y-2.5 transition-all',
      isActive ? 'border-champagne/30 bg-champagne/5' : 'border-border-luxury bg-charcoal/20',
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
          <span className="text-xs font-medium text-text-secondary">
            {fmtTime(slot.startAt)} – {fmtTime(slot.endAt)}
          </span>
          <span className="text-[10px] text-text-tertiary">{totalDuration}м</span>
        </div>
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider', statusCls)}>
          {slot.status}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <User className="w-3.5 h-3.5 text-text-tertiary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onClientClick(slot.clientId)}
              className="flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-champagne transition-colors group"
            >
              {slot.client.displayName}
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {slot.client.isVip && (
              <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded uppercase">VIP</span>
            )}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">{slot.services.map((s) => s.name).join(', ')}</div>
        </div>
      </div>

      {slot.client.allergies.length > 0 && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/8 border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {slot.client.allergies.map((a, i) => (
              <span key={i} className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                {a.name}{a.severity !== 'MILD' ? ` (${a.severity})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {slot.client.serviceNotes && (
        <p className="text-xs text-text-secondary italic px-1">{slot.client.serviceNotes}</p>
      )}

      {slot.room && (
        <div className="text-[10px] text-text-tertiary">{t('portal.today.room')}: {slot.room.name}</div>
      )}

      {(canStart || canComplete) && (
        <div className="flex justify-end pt-1">
          {canStart && (
            <ActionBtn
              label={t('portal.today.start')}
              variant="primary"
              loading={actionLoading === slot.id + 'start'}
              onClick={() => onAction(slot.id, 'start')}
            />
          )}
          {canComplete && (
            <ActionBtn
              label={t('portal.today.complete')}
              variant="success"
              loading={actionLoading === slot.id + 'complete'}
              onClick={() => onAction(slot.id, 'complete')}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TodayTab() {
  const { t } = useLanguage();
  const [data, setData] = React.useState<TodayData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/specialist/portal/today');
      const j = await res.json() as { success: boolean; data?: TodayData; error?: { message: string } };
      if (j.success && j.data) { setData(j.data); setError(null); }
      else setError(j.error?.message ?? t('common.error'));
    } catch { setError(t('common.error')); }
    finally { setLoading(false); }
  }, [t]);

  React.useEffect(() => { void load(); }, [load]);

  const doAction = React.useCallback(async (id: string, action: string) => {
    setActionLoading(id + action);
    try {
      await fetch(`/api/operations/appointments/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setLoading(true);
      await load();
    } finally { setActionLoading(null); }
  }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-2 text-text-tertiary">
      <Loader2 className="w-5 h-5 animate-spin" /><span>{t('common.loading')}</span>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <AlertTriangle className="w-8 h-8 text-amber-400" />
      <p className="text-sm text-text-secondary">{error}</p>
      <button onClick={() => { setLoading(true); void load(); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-charcoal text-text-secondary border border-border-luxury">
        <RefreshCw className="w-3.5 h-3.5" />{t('common.refresh')}
      </button>
    </div>
  );
  if (!data) return null;

  const { slots, workload } = data;
  const active = slots.find((s) => s.status === 'IN_PROGRESS') ?? null;
  const waiting = slots.filter((s) => ['ARRIVED', 'WAITING'].includes(s.status));
  const upcoming = slots.filter((s) => ['PENDING', 'CONFIRMED'].includes(s.status));
  const completed = slots.filter((s) => s.status === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('portal.today.total')} value={slots.length} />
        <StatCard label={t('portal.today.completedLabel')} value={completed} />
        <StatCard label={t('portal.today.waiting')} value={waiting.length} />
      </div>

      {workload && <WorkloadBar workload={workload} t={t} />}

      {active && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-champagne animate-pulse" />
            <h4 className="text-[10px] font-semibold text-champagne uppercase tracking-wider">{t('portal.today.inProgress')}</h4>
          </div>
          <TodaySlotCard slot={active} onAction={doAction} actionLoading={actionLoading} onClientClick={setSelectedClientId} />
        </div>
      )}

      {waiting.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">{t('portal.today.waitingSection')}</h4>
          {waiting.filter((s) => s.id !== active?.id).map((s) => (
            <TodaySlotCard key={s.id} slot={s} onAction={doAction} actionLoading={actionLoading} onClientClick={setSelectedClientId} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{t('portal.today.upcoming')}</h4>
          {upcoming.map((s) => (
            <TodaySlotCard key={s.id} slot={s} onAction={doAction} actionLoading={actionLoading} onClientClick={setSelectedClientId} />
          ))}
        </div>
      )}

      {slots.length === 0 && (
        <div className="py-12 text-center">
          <Calendar className="w-10 h-10 text-text-tertiary/30 mx-auto mb-3" />
          <p className="text-sm text-text-tertiary">{t('portal.today.noAppointments')}</p>
        </div>
      )}

      {selectedClientId && (
        <ClientCardModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
      )}
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab() {
  const { t } = useLanguage();
  const [days, setDays] = React.useState<Record<string, ScheduleSlot[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/specialist/portal/schedule')
      .then((r) => r.json())
      .then((j: { success: boolean; data?: { days: Record<string, ScheduleSlot[]> }; error?: { message: string } }) => {
        if (j.success && j.data) setDays(j.data.days);
        else setError(j.error?.message ?? t('common.error'));
      })
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-2 text-text-tertiary">
      <Loader2 className="w-5 h-5 animate-spin" /><span>{t('common.loading')}</span>
    </div>
  );
  if (error) return <p className="text-center text-sm text-text-secondary py-8">{error}</p>;

  const parseDMY = (s: string) => {
    const [d, m, y] = s.split('.');
    return new Date(`${y}-${m}-${d}`).getTime();
  };
  const dateKeys = Object.keys(days).sort((a, b) => parseDMY(a) - parseDMY(b));

  const todayKey = (() => {
    const n = new Date();
    return `${String(n.getDate()).padStart(2, '0')}.${String(n.getMonth() + 1).padStart(2, '0')}.${n.getFullYear()}`;
  })();

  if (dateKeys.length === 0) return (
    <div className="py-12 text-center">
      <Calendar className="w-10 h-10 text-text-tertiary/30 mx-auto mb-3" />
      <p className="text-sm text-text-tertiary">{t('portal.schedule.noAppointments')}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {dateKeys.map((key) => {
        const slots = days[key] ?? [];
        const isToday = key === todayKey;
        return (
          <div key={key} className="rounded-xl border border-border-luxury bg-onyx/40 overflow-hidden">
            <div className={cn(
              'px-4 py-2.5 flex items-center justify-between border-b',
              isToday ? 'bg-champagne/8 border-champagne/20' : 'border-border-luxury/50',
            )}>
              <div className="flex items-center gap-2">
                <Calendar className={cn('w-3.5 h-3.5', isToday ? 'text-champagne' : 'text-text-tertiary')} />
                <span className={cn('text-sm font-semibold', isToday ? 'text-champagne' : 'text-text-primary')}>{key}</span>
                {isToday && (
                  <span className="text-[10px] font-bold text-champagne bg-champagne/10 px-1.5 py-0.5 rounded">
                    {t('portal.schedule.today')}
                  </span>
                )}
              </div>
              <span className="text-xs text-text-tertiary">{slots.length} {t('portal.schedule.appointments')}</span>
            </div>
            {slots.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-4">{t('portal.schedule.noAppointments')}</p>
            ) : (
              <div className="divide-y divide-border-luxury/30">
                {slots.map((slot) => (
                  <div key={slot.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-14 shrink-0">
                      <span className="text-xs font-medium text-text-secondary">{fmtTime(slot.startAt)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary truncate">{slot.client.displayName}</span>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider', STATUS_COLORS[slot.status] ?? STATUS_COLORS['PENDING'])}>
                          {slot.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5 truncate">
                        {slot.services.map((s) => s.name).join(', ')}
                      </div>
                    </div>
                    {slot.room && <span className="text-[10px] text-text-tertiary shrink-0">{slot.room}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────

function PerformanceTab() {
  const { t } = useLanguage();
  const now = new Date();
  const [year,  setYear]  = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1); // 1-based
  const [perf, setPerf]   = React.useState<PerfData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback((y: number, m: number) => {
    setLoading(true);
    fetch(`/api/specialist/portal/performance?year=${y}&month=${m}`)
      .then((r) => r.json())
      .then((j: { success: boolean; data?: PerfData }) => {
        if (j.success && j.data) setPerf(j.data);
      })
      .catch(() => {/* */})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(year, month); }, [load, year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return; // can't go into the future
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-2 text-text-tertiary">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
  if (!perf) return <p className="text-center text-sm text-text-secondary py-8">{t('common.noData')}</p>;

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-champagne" />
          <span className="text-sm font-semibold text-text-primary">{monthLabel}</span>
        </div>
        <button onClick={nextMonth}
          className={cn('p-1.5 rounded-lg transition-colors',
            isCurrentMonth
              ? 'text-text-tertiary/30 cursor-not-allowed'
              : 'text-text-tertiary hover:text-text-primary hover:bg-charcoal')}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Procedures Done */}
        <div className="rounded-2xl border border-border-luxury bg-onyx/50 p-4 flex flex-col gap-1">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{t('portal.perf.procsDone')}</p>
          <p className="text-2xl font-bold text-text-primary">{perf.month.proceduresDone}</p>
          <p className="text-[10px] text-text-tertiary">{t('portal.perf.completedAppts')}</p>
        </div>

        {/* Total Sales + Commission */}
        <div className="rounded-2xl border border-border-luxury bg-onyx/50 p-4 flex flex-col gap-2">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{t('portal.perf.salesCommission')}</p>
          <div>
            <p className="text-[10px] text-text-tertiary mb-0.5">{t('portal.perf.totalSales')}</p>
            <p className="text-lg font-bold text-champagne leading-tight">{formatCurrency(perf.month.totalSales)}</p>
          </div>
          <div className="border-t border-border-luxury/50 pt-2 space-y-1">
            <p className="text-[10px] text-text-tertiary">{t('portal.perf.yourCommission')}</p>
            <p className="text-base font-semibold text-green-400 leading-tight">{formatCurrency(perf.month.totalCommission)}</p>
            {(perf.month.commissionPending > 0 || perf.month.commissionApproved > 0) && (
              <div className="flex gap-2 pt-0.5">
                {perf.month.commissionApproved > 0 && (
                  <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/20 rounded px-1.5 py-0.5">
                    ✓ {formatCurrency(perf.month.commissionApproved)} {t('portal.perf.statusApproved')}
                  </span>
                )}
                {perf.month.commissionPending > 0 && (
                  <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5">
                    ⏳ {formatCurrency(perf.month.commissionPending)} {t('portal.perf.statusPending')}
                  </span>
                )}
              </div>
            )}
            {perf.month.totalCommission === 0 && (
              <p className="text-[9px] text-text-tertiary italic">{t('portal.perf.noCommission')}</p>
            )}
          </div>
        </div>

        {/* First-time: Purchased */}
        <div className="rounded-2xl border border-border-luxury bg-onyx/50 p-4 flex flex-col gap-1">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{t('portal.perf.newClients')}</p>
          <p className="text-2xl font-bold text-green-400">{perf.month.firstTimePurchased}</p>
          <p className="text-[10px] text-text-tertiary">{t('portal.perf.firstTimersBought')}</p>
        </div>

        {/* First-time: No Purchase */}
        <div className="rounded-2xl border border-border-luxury bg-onyx/50 p-4 flex flex-col gap-1">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{t('portal.perf.missedClients')}</p>
          <p className="text-2xl font-bold text-amber-400">{perf.month.firstTimeNoPurchase}</p>
          <p className="text-[10px] text-text-tertiary">{t('portal.perf.firstTimersNoVisit')}</p>
        </div>

        {/* Working Days — full width */}
        <div className="col-span-2 rounded-2xl border border-border-luxury bg-onyx/50 p-4 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{t('portal.perf.workingDays')}</p>
            <p className="text-[10px] text-text-tertiary">{t('portal.perf.daysWithAppts')}</p>
          </div>
          <p className="text-3xl font-bold text-text-primary">{perf.month.workingDays}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

type ReqType = 'leave' | 'schedule' | 'service';

function RequestForm({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage();
  const [reqType, setReqType] = React.useState<ReqType>('leave');
  const [date, setDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [note, setNote] = React.useState('');
  const [services, setServices] = React.useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (reqType !== 'service') return;
    fetch('/api/services?limit=100')
      .then((r) => r.json())
      .then((j: { success: boolean; data?: { items?: { id: string; name: string }[] } }) => {
        if (j.success && j.data?.items) setServices(j.data.items);
      })
      .catch(() => {/* */});
  }, [reqType]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    let body: Record<string, unknown>;
    if (reqType === 'leave') {
      if (!date) { setError(t('portal.req.errorDate')); setSubmitting(false); return; }
      body = { type: 'leave', date, ...(reason ? { reason } : {}) };
    } else if (reqType === 'schedule') {
      if (!description.trim()) { setError(t('portal.req.errorDesc')); setSubmitting(false); return; }
      body = { type: 'schedule', description };
    } else {
      if (!serviceId) { setError(t('portal.req.errorService')); setSubmitting(false); return; }
      body = { type: 'service', serviceId, ...(note ? { note } : {}) };
    }
    try {
      const res = await fetch('/api/specialist/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json() as { success: boolean; error?: { message: string } };
      if (j.success) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); onDone(); }, 1400);
      } else {
        setError(j.error?.message ?? t('common.error'));
      }
    } catch { setError(t('common.error')); }
    finally { setSubmitting(false); }
  };

  if (success) return (
    <div className="flex items-center justify-center gap-2 py-8 text-green-400">
      <Check className="w-5 h-5" />
      <span className="text-sm font-medium">{t('portal.req.submitted')}</span>
    </div>
  );

  const inputCls = 'w-full bg-charcoal/50 border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne/50';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['leave', 'schedule', 'service'] as ReqType[]).map((rt) => (
          <button
            key={rt}
            onClick={() => setReqType(rt)}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors',
              reqType === rt
                ? 'bg-champagne/15 text-champagne border-champagne/30'
                : 'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary',
            )}
          >
            {t(`portal.req.${rt}`)}
          </button>
        ))}
      </div>

      {reqType === 'leave' && (
        <>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">{t('portal.req.date')} *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">{t('portal.req.reason')}</label>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={t('portal.req.reasonPlaceholder')} className={cn(inputCls, 'resize-none')} />
          </div>
        </>
      )}

      {reqType === 'schedule' && (
        <div>
          <label className="text-xs text-text-secondary mb-1 block">{t('portal.req.description')} *</label>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t('portal.req.descPlaceholder')} className={cn(inputCls, 'resize-none')} />
        </div>
      )}

      {reqType === 'service' && (
        <>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">{t('portal.req.service_label')} *</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
              <option value="">{t('portal.req.selectService')}</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">{t('portal.req.note')}</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={t('portal.req.notePlaceholder')} className={cn(inputCls, 'resize-none')} />
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-champagne/15 text-champagne border border-champagne/30 hover:bg-champagne/25 disabled:opacity-50 transition-colors"
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" />{t('portal.req.submitting')}</>
          : <><Send className="w-4 h-4" />{t('portal.req.submit')}</>}
      </button>
    </div>
  );
}

function ProfileTab() {
  const { t } = useLanguage();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [requests, setRequests] = React.useState<{ leave: RequestItem[]; schedule: RequestItem[]; service: RequestItem[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [showRequestForm, setShowRequestForm] = React.useState(false);
  const [form, setForm] = React.useState({ displayName: '', phone: '', languagePreference: 'ru' });
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [editingServices, setEditingServices] = React.useState(false);
  const [allServices, setAllServices] = React.useState<{ id: string; name: string; baseDuration: number }[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<Set<string>>(new Set());
  const [savingServices, setSavingServices] = React.useState(false);
  const [servicesSaveMsg, setServicesSaveMsg] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        fetch('/api/specialist/portal/profile').then((r) => r.json()),
        fetch('/api/specialist/requests').then((r) => r.json()),
      ]);
      if (pRes.success && pRes.data) {
        const p = pRes.data as ProfileData;
        setProfile(p);
        setForm({ displayName: p.displayName ?? '', phone: p.user.phone ?? '', languagePreference: p.languagePreference ?? 'ru' });
        setSelectedServiceIds(new Set(p.services.map((s) => s.id)));
      }
      if (rRes.success && rRes.data) {
        setRequests(rRes.data as { leave: RequestItem[]; schedule: RequestItem[]; service: RequestItem[] });
      }
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void loadAll(); }, [loadAll]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/specialist/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName || undefined,
          phone: form.phone || null,
          languagePreference: form.languagePreference,
        }),
      });
      const j = await res.json() as { success: boolean };
      if (j.success) {
        setSaveMsg(t('portal.profile.saved'));
        setEditing(false);
        void loadAll();
        setTimeout(() => setSaveMsg(null), 2000);
      }
    } finally { setSaving(false); }
  };

  const openServicesEdit = async () => {
    if (allServices.length === 0) {
      try {
        const res = await fetch('/api/services?limit=200').then((r) => r.json()) as { success: boolean; data?: { services?: { id: string; name: string; baseDuration: number }[] } };
        if (res.success && res.data?.services) {
          setAllServices(res.data.services);
        }
      } catch { /* ignore */ }
    }
    setEditingServices(true);
  };

  const saveServices = async () => {
    setSavingServices(true);
    try {
      const res = await fetch('/api/specialist/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: Array.from(selectedServiceIds) }),
      });
      const j = await res.json() as { success: boolean };
      if (j.success) {
        setServicesSaveMsg(t('common.saved'));
        setEditingServices(false);
        void loadAll();
        setTimeout(() => setServicesSaveMsg(null), 2000);
      }
    } finally { setSavingServices(false); }
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allRequests: RequestItem[] = [
    ...(requests?.leave.map((r) => ({ ...r, type: 'leave' as const })) ?? []),
    ...(requests?.schedule.map((r) => ({ ...r, type: 'schedule' as const })) ?? []),
    ...(requests?.service.map((r) => ({ ...r, type: 'service' as const })) ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-2 text-text-tertiary">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
  if (!profile) return null;

  const inputCls = 'w-full bg-charcoal/50 border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne/50';

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <div className="rounded-2xl border border-border-luxury bg-onyx/50">
        <div className="px-4 py-3 border-b border-border-luxury flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-champagne" />
            <h3 className="text-sm font-semibold text-text-primary">{t('portal.profile.title')}</h3>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-champagne hover:text-champagne/80">
              {t('common.edit')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => setEditing(false)} className="text-xs text-text-tertiary hover:text-text-secondary">
                {t('common.cancel')}
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1 text-xs text-champagne hover:text-champagne/80 disabled:opacity-50">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                {saving ? t('portal.profile.saving') : t('common.save')}
              </button>
            </div>
          )}
        </div>
        <div className="p-4 space-y-4">
          {saveMsg && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/8 border border-green-400/20 rounded-lg px-3 py-2">
              <Check className="w-3.5 h-3.5" />{saveMsg}
            </div>
          )}

          {/* Read-only */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-text-tertiary mb-0.5">{t('portal.profile.fullName')}</p>
              <p className="text-text-primary font-medium">{profile.user.firstName} {profile.user.lastName}</p>
            </div>
            <div>
              <p className="text-text-tertiary mb-0.5">{t('portal.profile.email')}</p>
              <p className="text-text-primary">{profile.user.email}</p>
            </div>
            {profile.specialization && (
              <div>
                <p className="text-text-tertiary mb-0.5">{t('portal.profile.specialization')}</p>
                <p className="text-text-primary">{profile.specialization}</p>
              </div>
            )}
            {profile.hiredAt && (
              <div>
                <p className="text-text-tertiary mb-0.5">{t('portal.profile.hiredAt')}</p>
                <p className="text-text-primary">{new Date(profile.hiredAt).toLocaleDateString('ru-RU')}</p>
              </div>
            )}
          </div>

          {/* Editable */}
          <div className="border-t border-border-luxury/50 pt-3 space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('portal.profile.displayName')}</label>
              {editing ? (
                <input value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder={`${profile.user.firstName} ${profile.user.lastName}`}
                  className={inputCls} />
              ) : (
                <p className="text-sm text-text-primary">{profile.displayName ?? `${profile.user.firstName} ${profile.user.lastName}`}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('portal.profile.phone')}</label>
              {editing ? (
                <input value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7..."
                  className={inputCls} />
              ) : (
                <p className="text-sm text-text-primary">{profile.user.phone ?? '—'}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('portal.profile.language')}</label>
              {editing ? (
                <select value={form.languagePreference}
                  onChange={(e) => setForm((f) => ({ ...f, languagePreference: e.target.value }))}
                  className={inputCls}>
                  <option value="ru">{t('portal.profile.langRu')}</option>
                  <option value="en">{t('portal.profile.langEn')}</option>
                </select>
              ) : (
                <p className="text-sm text-text-primary">{profile.languagePreference === 'ru' ? t('portal.profile.langRu') : t('portal.profile.langEn')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My services */}
      <div className="rounded-2xl border border-border-luxury bg-onyx/50">
        <div className="px-4 py-3 border-b border-border-luxury flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-champagne" />
            <h3 className="text-sm font-semibold text-text-primary">{t('portal.profile.services')}</h3>
          </div>
          {!editingServices ? (
            <button onClick={openServicesEdit} className="text-xs text-champagne hover:text-champagne/80">
              {t('common.edit')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditingServices(false); setSelectedServiceIds(new Set(profile.services.map((s) => s.id))); }}
                className="text-xs text-text-tertiary hover:text-text-secondary">
                {t('common.cancel')}
              </button>
              <button onClick={saveServices} disabled={savingServices}
                className="flex items-center gap-1 text-xs text-champagne hover:text-champagne/80 disabled:opacity-50">
                {savingServices && <Loader2 className="w-3 h-3 animate-spin" />}
                {savingServices ? t('portal.profile.saving') : t('common.save')}
              </button>
            </div>
          )}
        </div>
        <div className="p-4">
          {servicesSaveMsg && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/8 border border-green-400/20 rounded-lg px-3 py-2 mb-3">
              <Check className="w-3.5 h-3.5" />{servicesSaveMsg}
            </div>
          )}
          {!editingServices ? (
            profile.services.length === 0 ? (
              <p className="text-xs text-text-tertiary">{t('portal.client.noServices')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.services.map((s) => (
                  <span key={s.id} className="text-xs text-text-secondary bg-charcoal/50 border border-border-luxury px-2.5 py-1 rounded-lg">
                    {s.name} <span className="text-text-tertiary">{s.baseDuration}{t('common.minAbbr')}</span>
                  </span>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {allServices.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading services…
                </div>
              ) : (
                allServices.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      selectedServiceIds.has(s.id)
                        ? 'bg-champagne border-champagne'
                        : 'border-border-luxury bg-charcoal/30 group-hover:border-champagne/40'
                    }`}
                      onClick={() => toggleService(s.id)}>
                      {selectedServiceIds.has(s.id) && (
                        <Check className="w-2.5 h-2.5 text-obsidian" />
                      )}
                    </div>
                    <span className="text-sm text-text-primary flex-1" onClick={() => toggleService(s.id)}>{s.name}</span>
                    <span className="text-xs text-text-tertiary">{s.baseDuration}м</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* My schedule — monthly calendar */}
      <div className="rounded-2xl border border-border-luxury bg-onyx/50">
        <div className="px-4 py-3 border-b border-border-luxury flex items-center gap-2">
          <Calendar className="w-4 h-4 text-champagne" />
          <h3 className="text-sm font-semibold text-text-primary">{t('portal.profile.schedule')}</h3>
        </div>
        <div className="p-4">
          <ScheduleCalendar />
        </div>
      </div>

      {/* Requests */}
      <div className="rounded-2xl border border-border-luxury bg-onyx/50">
        <div className="px-4 py-3 border-b border-border-luxury flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-champagne" />
            <h3 className="text-sm font-semibold text-text-primary">{t('portal.req.title')}</h3>
          </div>
          <button
            onClick={() => setShowRequestForm((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              showRequestForm
                ? 'bg-charcoal text-text-secondary border-border-luxury'
                : 'bg-champagne/15 text-champagne border-champagne/30 hover:bg-champagne/25',
            )}
          >
            {showRequestForm
              ? <><X className="w-3.5 h-3.5" />{t('common.cancel')}</>
              : <><Plus className="w-3.5 h-3.5" />{t('portal.req.new')}</>}
          </button>
        </div>
        <div className="p-4 space-y-4">
          {showRequestForm && (
            <div className="rounded-xl border border-champagne/20 bg-champagne/5 p-4">
              <RequestForm onDone={() => { setShowRequestForm(false); void loadAll(); }} />
            </div>
          )}

          {allRequests.length === 0 && !showRequestForm ? (
            <p className="text-sm text-text-tertiary text-center py-4">{t('portal.req.empty')}</p>
          ) : allRequests.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{t('portal.req.history')}</h4>
              {allRequests.map((r) => (
                <div key={r.id} className="rounded-lg border border-border-luxury/50 bg-charcoal/20 p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-text-primary">{t(`portal.req.${r.type}`)}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider', REQ_STATUS_COLORS[r.status] ?? '')}>
                      {t(`portal.req.status.${r.status}`)}
                    </span>
                    <span className="text-[10px] text-text-tertiary ml-auto">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  {r.date && <p className="text-xs text-text-secondary">{r.date}</p>}
                  {r.reason && <p className="text-xs text-text-secondary">{r.reason}</p>}
                  {r.description && <p className="text-xs text-text-secondary">{r.description}</p>}
                  {r.serviceName && <p className="text-xs text-text-secondary">{r.serviceName}</p>}
                  {r.reviewNotes && (
                    <p className="text-xs text-text-tertiary italic">{t('portal.req.reviewNotes')}: {r.reviewNotes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'today' | 'schedule' | 'performance' | 'profile';

interface TabDef {
  id: TabId;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: 'today',       labelKey: 'portal.tab.today',       Icon: Activity },
  { id: 'schedule',    labelKey: 'portal.tab.schedule',    Icon: Calendar },
  { id: 'performance', labelKey: 'portal.tab.performance', Icon: TrendingUp },
  { id: 'profile',     labelKey: 'portal.tab.profile',     Icon: UserCircle },
];

export default function MyPanelPage() {
  const { t } = useLanguage();
  const [tab, setTab] = React.useState<TabId>('today');

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-text-primary">{t('nav.myPanel')}</h2>
        <p className="text-sm text-text-tertiary mt-0.5">{t('portal.subtitle')}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-charcoal/50 rounded-xl border border-border-luxury overflow-x-auto">
        {TABS.map(({ id, labelKey, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 min-w-0',
              tab === id
                ? 'bg-onyx text-champagne shadow-sm border border-champagne/20'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'today'       && <TodayTab />}
      {tab === 'schedule'    && <ScheduleTab />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'profile'     && <ProfileTab />}
    </div>
  );
}
