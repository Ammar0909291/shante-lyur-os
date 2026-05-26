'use client';

import * as React from 'react';
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Inbox,
  AlertTriangle, Calendar, ShieldAlert, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authHeaders } from '@/lib/client-auth';

// ─── Shared types ─────────────────────────────────────────────────────────────

interface LeaveReq {
  id: string; specialistId: string; specialistName: string;
  date: string; reason: string | null; status: string;
  reviewNotes: string | null; createdAt: string;
}
interface ServiceReq {
  id: string; specialistId: string; specialistName: string;
  serviceId: string; serviceName: string; note: string | null; status: string;
  reviewNotes: string | null; createdAt: string;
}
interface ScheduleDay { date: string; isWorkDay: boolean }
interface ScheduleRequest {
  id: string; specialistId: string; specialistName: string;
  department: string; status: string;
  days: ScheduleDay[]; workDayCount: number;
  note: string | null; submittedAt: string;
  reviewNotes: string | null; reviewedAt: string | null;
}
interface Coverage { MASSAGE: number; COSMETOLOGY: number }

type OldRequestsData = { leave: LeaveReq[]; service: ServiceReq[] };
type TabId = 'leave' | 'schedule' | 'service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MIN_STAFF = 6;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function upcomingMonths(count = 4): string[] {
  const result: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // current month (1-indexed) — admin sees current + future
  for (let i = 0; i < count; i++) {
    result.push(`${y}-${String(m).padStart(2,'0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
  REJECTED: 'text-red-400   bg-red-400/10   border-red-400/20',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'На рассмотрении', APPROVED: 'Одобрено', REJECTED: 'Отклонено',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider',
      STATUS_STYLES[status] ?? STATUS_STYLES['PENDING'])}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function DeptBadge({ dept }: { dept: string }) {
  const map: Record<string, string> = { MASSAGE: 'Массаж', COSMETOLOGY: 'Косметология' };
  const cls = dept === 'MASSAGE'
    ? 'bg-blue-400/10 text-blue-300 border-blue-400/20'
    : 'bg-purple-400/10 text-purple-300 border-purple-400/20';
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider', cls)}>
      {map[dept] ?? dept}
    </span>
  );
}

// ─── Old review modal (leave / service) ───────────────────────────────────────

interface ReviewModalProps {
  id: string; requestType: 'leave' | 'service'; label: string;
  onDone: () => void; onClose: () => void;
}
function ReviewModal({ id, requestType, label, onDone, onClose }: ReviewModalProps) {
  const [status, setStatus] = React.useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/specialist-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ requestType, status, reviewNotes: notes || undefined }),
      });
      const j = await res.json() as { success: boolean; error?: { message: string } };
      if (j.success) { onDone(); onClose(); }
      else setError(j.error?.message ?? 'Ошибка');
    } catch { setError('Ошибка сети'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-onyx border border-border-luxury rounded-2xl shadow-luxury-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border-luxury">
          <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            {(['APPROVED','REJECTED'] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors',
                  status === s && s === 'APPROVED' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                  status === s && s === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                  'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary')}>
                {s === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {s === 'APPROVED' ? 'Одобрить' : 'Отклонить'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Комментарий (необязательно)</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Причина решения..."
              className="w-full bg-charcoal/50 border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne/50 resize-none" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium text-text-secondary bg-charcoal border border-border-luxury hover:text-text-primary transition-colors">Отмена</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-champagne/15 text-champagne border border-champagne/30 hover:bg-champagne/25 disabled:opacity-50 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule review modal ────────────────────────────────────────────────────

interface ScheduleReviewModalProps {
  request: ScheduleRequest;
  coverage: Record<string, Coverage>;
  alerts: string[];
  onDone: () => void;
  onClose: () => void;
}

function ScheduleReviewModal({ request, coverage, alerts, onDone, onClose }: ScheduleReviewModalProps) {
  const [decision, setDecision] = React.useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [y, m] = request.days[0]?.date.split('-').map(Number) ?? [new Date().getFullYear(), new Date().getMonth() + 1];
  const monthIdx = m - 1;
  const firstDow = new Date(y, monthIdx, 1).getDay();
  const blanks = firstDow === 0 ? 6 : firstDow - 1;

  const dayMap = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const d of request.days) map[d.date] = d.isWorkDay;
    return map;
  }, [request.days]);

  const workAlerts = new Set(alerts.filter((a) => dayMap[a]));
  const dept = request.department as 'MASSAGE' | 'COSMETOLOGY';

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/v1/admin/schedule-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: decision, reviewNotes: notes || undefined }),
      });
      const j = await res.json() as { success: boolean; error?: { message: string } };
      if (j.success) { onDone(); onClose(); }
      else setError(j.error?.message ?? 'Ошибка');
    } catch { setError('Ошибка сети'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-onyx border border-border-luxury rounded-2xl shadow-luxury-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-border-luxury flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{request.specialistName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <DeptBadge dept={request.department} />
              <span className="text-xs text-text-tertiary">{request.workDayCount} рабочих дней · подан {fmtDate(request.submittedAt)}</span>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Calendar */}
          <div>
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d) => (
                <div key={d} className="text-center text-[10px] text-text-tertiary py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
              {request.days.map((d) => {
                const dt = new Date(d.date + 'T00:00:00');
                const isAlert = workAlerts.has(d.date);
                const dayCov = coverage[d.date];
                const ownCount = dayCov ? dayCov[dept] : 0;
                return (
                  <div key={d.date} title={d.isWorkDay ? `${dept === 'MASSAGE' ? 'Массажисты' : 'Косметологи'}: ${ownCount}/${MIN_STAFF}` : undefined}
                    className={cn('h-10 rounded flex flex-col items-center justify-center text-xs',
                      !d.isWorkDay ? 'bg-charcoal/30 text-text-tertiary' :
                      isAlert ? 'bg-red-900/50 border border-red-500/40 text-red-300' :
                      'bg-emerald-900/40 border border-emerald-600/30 text-emerald-300')}>
                    <span className="font-medium">{dt.getDate()}</span>
                    {d.isWorkDay && dayCov && (
                      <span className={cn('text-[9px]', isAlert ? 'text-red-400' : 'text-text-tertiary')}>
                        {ownCount}/{MIN_STAFF}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-[10px] text-text-tertiary flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-800/60 border border-emerald-600/30 inline-block" />Рабочий</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-800/60 border border-red-500/40 inline-block" />Недобор</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-charcoal/30" />Выходной</span>
            <span className="text-text-tertiary">Число = специалистов этого типа на день</span>
          </div>

          {/* Coverage alerts */}
          {workAlerts.size > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-amber-300">Дни с недобором (менее {MIN_STAFF} специалистов)</p>
              </div>
              <p className="text-[10px] text-amber-400/80">
                {[...workAlerts].sort().map((d) => fmtDate(d)).join(', ')}
              </p>
            </div>
          )}

          {/* Note from specialist */}
          {request.note && (
            <div className="bg-charcoal/40 border border-border-luxury rounded-xl p-3">
              <p className="text-[10px] text-text-tertiary mb-1">Примечание специалиста</p>
              <p className="text-xs text-text-secondary">{request.note}</p>
            </div>
          )}
        </div>

        {/* Footer — only show actions if still pending */}
        {request.status === 'PENDING' && (
          <div className="p-4 border-t border-border-luxury flex-shrink-0 space-y-3">
            <div className="flex gap-2">
              {(['APPROVED','REJECTED'] as const).map((s) => (
                <button key={s} onClick={() => setDecision(s)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors',
                    decision === s && s === 'APPROVED' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                    decision === s && s === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                    'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary')}>
                  {s === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {s === 'APPROVED' ? 'Одобрить' : 'Отклонить'}
                </button>
              ))}
            </div>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий администратора (необязательно)..."
              className="w-full bg-charcoal/50 border border-border-luxury rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-champagne/50 resize-none" />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium text-text-secondary bg-charcoal border border-border-luxury hover:text-text-primary transition-colors">
                Отмена
              </button>
              <button onClick={submit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-champagne/15 text-champagne border border-champagne/30 hover:bg-champagne/25 disabled:opacity-50 transition-colors">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

interface ScheduleTabData {
  month: string;
  requests: ScheduleRequest[];
  coverage: Record<string, Coverage>;
  alerts: string[];
}

function ScheduleTab() {
  const months = upcomingMonths(4);
  const [selectedMonth, setSelectedMonth] = React.useState(months[0]);
  const [data, setData] = React.useState<ScheduleTabData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [reviewing, setReviewing] = React.useState<ScheduleRequest | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/schedule-requests?month=${selectedMonth}`, { headers: authHeaders() });
      const j = await res.json() as { success: boolean; data?: ScheduleTabData };
      if (j.success && j.data) setData(j.data);
    } finally { setLoading(false); }
  }, [selectedMonth]);

  React.useEffect(() => { void load(); }, [load]);

  const [y, m] = selectedMonth.split('-').map(Number);

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {months.map((ms) => {
          const [my, mm] = ms.split('-').map(Number);
          return (
            <button key={ms} onClick={() => setSelectedMonth(ms)}
              className={cn('flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                ms === selectedMonth
                  ? 'bg-champagne/15 text-champagne border-champagne/30'
                  : 'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary')}>
              {MONTH_RU[mm - 1]} {my}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-text-tertiary" /></div>
      ) : !data || data.requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-tertiary">
          <Inbox className="w-8 h-8" />
          <p className="text-sm">Нет заявок на {MONTH_RU[m - 1]} {y}</p>
        </div>
      ) : (
        <>
          {/* Coverage summary */}
          {data.alerts.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-300">{data.alerts.length} {data.alerts.length === 1 ? 'день' : 'дней'} с недобором специалистов (менее {MIN_STAFF})</p>
              </div>
              <div className="flex gap-4 text-xs text-text-tertiary">
                {data.alerts.slice(0, 6).map((d) => (
                  <span key={d}>{fmtDate(d)}</span>
                ))}
                {data.alerts.length > 6 && <span>+{data.alerts.length - 6} ещё</span>}
              </div>
            </div>
          )}

          {/* Staffing summary row */}
          <div className="grid grid-cols-2 gap-3">
            {(['MASSAGE','COSMETOLOGY'] as const).map((dept) => {
              const deptReqs = data.requests.filter((r) => r.department === dept);
              const label = dept === 'MASSAGE' ? 'Массажисты' : 'Косметологи';
              const pending = deptReqs.filter((r) => r.status === 'PENDING').length;
              const approved = deptReqs.filter((r) => r.status === 'APPROVED').length;
              return (
                <div key={dept} className="bg-charcoal/40 border border-border-luxury rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-text-tertiary" />
                    <p className="text-xs font-medium text-text-primary">{label}</p>
                  </div>
                  <p className="text-lg font-bold text-champagne">{deptReqs.length}</p>
                  <p className="text-[10px] text-text-tertiary">{approved} одобрено · {pending} ожидает</p>
                </div>
              );
            })}
          </div>

          {/* Request cards */}
          <div className="space-y-2">
            {data.requests.map((r) => {
              const hasAlerts = data.alerts.some((a) => r.days.some((d) => d.isWorkDay && d.date === a));
              return (
                <div key={r.id}
                  className={cn('rounded-xl border p-4',
                    r.status === 'PENDING'
                      ? 'bg-charcoal/20 border-border-luxury'
                      : 'bg-charcoal/10 border-border-luxury/40 opacity-75')}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text-primary">{r.specialistName}</span>
                      <DeptBadge dept={r.department} />
                      <StatusBadge status={r.status} />
                      {hasAlerts && <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" /> Недобор</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                      <Calendar className="w-3 h-3" />
                      {r.workDayCount} дней · {fmtDate(r.submittedAt)}
                    </div>
                  </div>
                  {r.reviewNotes && (
                    <p className="mt-2 text-xs text-text-tertiary italic">{r.reviewNotes}</p>
                  )}
                  {r.status === 'PENDING' && (
                    <div className="flex justify-end mt-2">
                      <button onClick={() => setReviewing(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-champagne/15 text-champagne border border-champagne/30 hover:bg-champagne/25 transition-colors">
                        Рассмотреть
                      </button>
                    </div>
                  )}
                  {r.status !== 'PENDING' && (
                    <div className="flex justify-end mt-2">
                      <button onClick={() => setReviewing(r)}
                        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                        Просмотреть →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {reviewing && (
        <ScheduleReviewModal
          request={reviewing}
          coverage={data?.coverage ?? {}}
          alerts={data?.alerts ?? []}
          onDone={load}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}

// ─── Generic request card ─────────────────────────────────────────────────────

interface CardProps<T> {
  req: T;
  requestType: 'leave' | 'service';
  onReview: (id: string, type: 'leave' | 'service', label: string) => void;
}

function ReqCard<T extends { id: string; specialistName: string; status: string; reviewNotes: string | null; createdAt: string }>({
  req, requestType, onReview, children,
}: CardProps<T> & { children: React.ReactNode }) {
  const isPending = req.status === 'PENDING';
  return (
    <div className={cn('rounded-xl border p-4 space-y-2.5',
      isPending ? 'border-border-luxury bg-charcoal/20' : 'border-border-luxury/40 bg-charcoal/10 opacity-80')}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold text-text-primary">{req.specialistName}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={req.status} />
          <span className="text-[10px] text-text-tertiary">{new Date(req.createdAt).toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
      {children}
      {req.reviewNotes && (
        <p className="text-xs text-text-tertiary italic border-t border-border-luxury/40 pt-2">Комментарий: {req.reviewNotes}</p>
      )}
      {isPending && (
        <div className="flex justify-end pt-1">
          <button onClick={() => onReview(req.id, requestType, `Запрос от ${req.specialistName}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-champagne/15 text-champagne border border-champagne/30 hover:bg-champagne/25 transition-colors">
            Рассмотреть
          </button>
        </div>
      )}
    </div>
  );
}

function LeaveList({ items, onReview }: { items: LeaveReq[]; onReview: CardProps<LeaveReq>['onReview'] }) {
  if (items.length === 0) return <Empty />;
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <ReqCard key={r.id} req={r} requestType="leave" onReview={onReview}>
          <div className="text-xs text-text-secondary space-y-0.5">
            <p><span className="text-text-tertiary">Дата: </span>{new Date(r.date).toLocaleDateString('ru-RU')}</p>
            {r.reason && <p><span className="text-text-tertiary">Причина: </span>{r.reason}</p>}
          </div>
        </ReqCard>
      ))}
    </div>
  );
}

function ServiceList({ items, onReview }: { items: ServiceReq[]; onReview: CardProps<ServiceReq>['onReview'] }) {
  if (items.length === 0) return <Empty />;
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <ReqCard key={r.id} req={r} requestType="service" onReview={onReview}>
          <div className="text-xs text-text-secondary space-y-0.5">
            <p><span className="text-text-tertiary">Услуга: </span>{r.serviceName}</p>
            {r.note && <p><span className="text-text-tertiary">Примечание: </span>{r.note}</p>}
          </div>
        </ReqCard>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-tertiary">
      <Inbox className="w-8 h-8" />
      <p className="text-sm">Нет заявок</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffRequestsPage() {
  const [data, setData] = React.useState<OldRequestsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabId>('schedule');
  const [review, setReview] = React.useState<{ id: string; type: 'leave' | 'service'; label: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/specialist-requests', { headers: authHeaders() });
      const j = await res.json() as { success: boolean; data?: { leave: LeaveReq[]; schedule: unknown[]; service: ServiceReq[] }; error?: { message: string } };
      if (j.success && j.data) setData({ leave: j.data.leave, service: j.data.service });
      else setError(j.error?.message ?? 'Ошибка загрузки');
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const pendingLeave   = data?.leave.filter((r) => r.status === 'PENDING').length ?? 0;
  const pendingService = data?.service.filter((r) => r.status === 'PENDING').length ?? 0;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'schedule', label: 'Графики' },
    { id: 'leave',    label: 'Отгулы' },
    { id: 'service',  label: 'Процедуры' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary">Заявки сотрудников</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Рассмотрение запросов специалистов</p>
        </div>
        <button onClick={load} disabled={loading}
          className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal border border-border-luxury transition-colors disabled:opacity-50">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-charcoal/50 rounded-xl border border-border-luxury">
        {TABS.map(({ id, label }) => {
          const count = id === 'leave' ? pendingLeave : id === 'service' ? pendingService : 0;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                tab === id ? 'bg-onyx text-champagne shadow-sm border border-champagne/20' : 'text-text-secondary hover:text-text-primary')}>
              {label}
              {count > 0 && (
                <span className="text-[10px] font-bold bg-champagne text-obsidian rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === 'schedule' && <ScheduleTab />}

      {tab !== 'schedule' && (
        loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-text-tertiary">
            <Loader2 className="w-5 h-5 animate-spin" /><span>Загрузка...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-sm text-text-secondary">{error}</p>
            <button onClick={load} className="text-xs text-champagne hover:underline">Повторить</button>
          </div>
        ) : data ? (
          <>
            {tab === 'leave'   && <LeaveList   items={data.leave}   onReview={(id, type, label) => setReview({ id, type: type as 'leave' | 'service', label })} />}
            {tab === 'service' && <ServiceList items={data.service} onReview={(id, type, label) => setReview({ id, type: type as 'leave' | 'service', label })} />}
          </>
        ) : null
      )}

      {review && (
        <ReviewModal id={review.id} requestType={review.type} label={review.label} onDone={load} onClose={() => setReview(null)} />
      )}
    </div>
  );
}
