'use client';

import * as React from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Inbox, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authHeaders } from '@/lib/client-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaveReq {
  id: string; specialistId: string; specialistName: string;
  date: string; reason: string | null; status: string;
  reviewNotes: string | null; createdAt: string;
}
interface ScheduleReq {
  id: string; specialistId: string; specialistName: string;
  description: string; status: string;
  reviewNotes: string | null; createdAt: string;
}
interface ServiceReq {
  id: string; specialistId: string; specialistName: string;
  serviceId: string; serviceName: string; note: string | null; status: string;
  reviewNotes: string | null; createdAt: string;
}

type RequestsData = { leave: LeaveReq[]; schedule: ScheduleReq[]; service: ServiceReq[] };
type TabId = 'leave' | 'schedule' | 'service';

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
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider', STATUS_STYLES[status] ?? STATUS_STYLES['PENDING'])}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Review modal ─────────────────────────────────────────────────────────────

interface ReviewModalProps {
  id: string;
  requestType: 'leave' | 'schedule' | 'service';
  label: string;
  onDone: () => void;
  onClose: () => void;
}

function ReviewModal({ id, requestType, label, onDone, onClose }: ReviewModalProps) {
  const [status, setStatus] = React.useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
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
      <div className="w-full max-w-sm bg-onyx border border-border-luxury rounded-2xl shadow-luxury-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border-luxury">
          <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            {(['APPROVED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors',
                  status === s && s === 'APPROVED' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                  status === s && s === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                  'bg-charcoal text-text-secondary border-border-luxury hover:text-text-primary',
                )}
              >
                {s === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {s === 'APPROVED' ? 'Одобрить' : 'Отклонить'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Комментарий (необязательно)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Причина решения..."
              className="w-full bg-charcoal/50 border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne/50 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium text-text-secondary bg-charcoal border border-border-luxury hover:text-text-primary transition-colors">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-champagne/15 text-champagne border border-champagne/30 hover:bg-champagne/25 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────────

interface CardProps<T> {
  req: T;
  requestType: 'leave' | 'schedule' | 'service';
  onReview: (id: string, type: 'leave' | 'schedule' | 'service', label: string) => void;
}

function ReqCard<T extends { id: string; specialistName: string; status: string; reviewNotes: string | null; createdAt: string }>({
  req, requestType, onReview, children,
}: CardProps<T> & { children: React.ReactNode }) {
  const isPending = req.status === 'PENDING';
  return (
    <div className={cn('rounded-xl border p-4 space-y-2.5', isPending ? 'border-border-luxury bg-charcoal/20' : 'border-border-luxury/40 bg-charcoal/10 opacity-80')}>
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
          <button
            onClick={() => onReview(req.id, requestType, `Запрос от ${req.specialistName}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-champagne/15 text-champagne border border-champagne/30 hover:bg-champagne/25 transition-colors"
          >
            Рассмотреть
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

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

function ScheduleList({ items, onReview }: { items: ScheduleReq[]; onReview: CardProps<ScheduleReq>['onReview'] }) {
  if (items.length === 0) return <Empty />;
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <ReqCard key={r.id} req={r} requestType="schedule" onReview={onReview}>
          <p className="text-xs text-text-secondary">{r.description}</p>
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
  const [data, setData] = React.useState<RequestsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabId>('leave');
  const [review, setReview] = React.useState<{ id: string; type: 'leave' | 'schedule' | 'service'; label: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/specialist-requests', { headers: authHeaders() });
      const j = await res.json() as { success: boolean; data?: RequestsData; error?: { message: string } };
      if (j.success && j.data) setData(j.data);
      else setError(j.error?.message ?? 'Ошибка загрузки');
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const pendingCount = (type: TabId) => {
    if (!data) return 0;
    return data[type].filter((r) => r.status === 'PENDING').length;
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'leave',    label: 'Отгулы' },
    { id: 'schedule', label: 'График' },
    { id: 'service',  label: 'Процедуры' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-medium text-text-primary">Заявки сотрудников</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Рассмотрение запросов специалистов</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal border border-border-luxury transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-charcoal/50 rounded-xl border border-border-luxury">
        {TABS.map(({ id, label }) => {
          const count = pendingCount(id);
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                tab === id ? 'bg-onyx text-champagne shadow-sm border border-champagne/20' : 'text-text-secondary hover:text-text-primary',
              )}
            >
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
      {loading ? (
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
          {tab === 'leave'    && <LeaveList    items={data.leave}    onReview={(id, type, label) => setReview({ id, type, label })} />}
          {tab === 'schedule' && <ScheduleList items={data.schedule} onReview={(id, type, label) => setReview({ id, type, label })} />}
          {tab === 'service'  && <ServiceList  items={data.service}  onReview={(id, type, label) => setReview({ id, type, label })} />}
        </>
      ) : null}

      {/* Review modal */}
      {review && (
        <ReviewModal
          id={review.id}
          requestType={review.type}
          label={review.label}
          onDone={load}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  );
}
