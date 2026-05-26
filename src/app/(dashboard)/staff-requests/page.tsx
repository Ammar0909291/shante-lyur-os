'use client';

import * as React from 'react';
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Inbox,
  AlertTriangle, Calendar, ShieldAlert, Users, LayoutGrid, Table2,
  Download, Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

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
  const [rejecting, setRejecting] = React.useState(false);
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

  const submit = async (status: 'APPROVED' | 'REJECTED') => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/v1/admin/schedule-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status, reviewNotes: notes || undefined }),
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
            {/* Rejection notes — shown only when rejecting */}
            {rejecting && (
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Причина отклонения (необязательно)..."
                className="w-full bg-charcoal/50 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-red-500/50 resize-none" />
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium text-text-secondary bg-charcoal border border-border-luxury hover:text-text-primary transition-colors">
                Отмена
              </button>
              {rejecting ? (
                <>
                  <button onClick={() => setRejecting(false)}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-text-secondary bg-charcoal border border-border-luxury hover:text-text-primary transition-colors">
                    Назад
                  </button>
                  <button onClick={() => void submit('REJECTED')} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Отклонить
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setRejecting(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Отклонить
                  </button>
                  <button onClick={() => void submit('APPROVED')} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Одобрить
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schedule table view ──────────────────────────────────────────────────────

interface ScheduleTabData {
  month: string;
  requests: ScheduleRequest[];
  coverage: Record<string, Coverage>;
  alerts: string[];
}

interface ScheduleTableProps {
  data: ScheduleTabData;
  month: string;
  onReview: (r: ScheduleRequest) => void;
}

function exportScheduleXlsx(data: ScheduleTabData, month: string) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const cols = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { d, dateStr };
  });

  const DEPT_LABEL: Record<string, string> = { MASSAGE: 'Массаж', COSMETOLOGY: 'Косметология' };
  const STATUS_LABEL: Record<string, string> = { PENDING: 'Ожидает', APPROVED: 'Одобрено', REJECTED: 'Отклонено' };

  const header = ['Сотрудник', 'Отдел', 'Статус', ...cols.map((c) => String(c.d)), '∑'];
  const rows: (string | number)[][] = [header];

  for (const r of data.requests) {
    const dayMap: Record<string, boolean> = {};
    for (const d of r.days) dayMap[d.date] = d.isWorkDay;
    rows.push([
      r.specialistName,
      DEPT_LABEL[r.department] ?? r.department,
      STATUS_LABEL[r.status] ?? r.status,
      ...cols.map((c) => (dayMap[c.dateStr] ? 'Р' : '')),
      r.workDayCount,
    ]);
  }

  // Coverage footer rows
  for (const dept of ['MASSAGE', 'COSMETOLOGY'] as const) {
    rows.push([
      dept === 'MASSAGE' ? 'Массажисты' : 'Косметологи', '', '',
      ...cols.map((c) => data.coverage[c.dateStr]?.[dept] ?? 0),
      '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }, ...cols.map(() => ({ wch: 4 })), { wch: 4 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `График ${month}`);
  XLSX.writeFile(wb, `schedule-${month}.xlsx`);
}

function printScheduleTable(month: string) {
  const el = document.getElementById('schedule-print-area');
  if (!el) return;
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>График ${month}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 10px; background: #fff; color: #000; padding: 12px; }
      h2 { font-size: 13px; margin-bottom: 8px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #bbb; padding: 3px 4px; text-align: center; white-space: nowrap; }
      th { background: #f0f0f0; font-weight: 600; }
      td:first-child, th:first-child { text-align: left; min-width: 130px; }
      .work-approved { background: #bbf7d0; }
      .work-pending  { background: #fde68a; }
      .work-alert    { background: #fca5a5; }
      .cover-short   { background: #fecaca; font-weight: bold; }
      .cover-ok      { background: #d1fae5; }
      .cover-zero    { color: #ccc; }
      tfoot tr td    { background: #f8f8f8; font-weight: bold; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>`);
  win.document.write(`<h2>График на ${month}</h2>`);
  win.document.write(el.innerHTML);
  win.document.write(`</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

function ScheduleTable({ data, month, onReview }: ScheduleTableProps) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const alertSet = new Set(data.alerts);

  const cols = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(y, m - 1, d).getDay();
    return { d, dateStr, dow };
  });

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => exportScheduleXlsx(data, month)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Excel
        </button>
        <button
          onClick={() => printScheduleTable(month)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Печать
        </button>
      </div>

      <div id="schedule-print-area" className="overflow-x-auto rounded-xl border border-border-luxury">
        <table className="text-xs border-collapse" style={{ minWidth: 'max-content' }}>
          {/* Header row */}
          <thead>
            <tr className="bg-charcoal border-b border-border-luxury">
              <th className="sticky left-0 z-20 bg-charcoal px-3 py-2 text-left text-text-tertiary font-medium whitespace-nowrap border-r border-border-luxury/60"
                style={{ minWidth: 160 }}>
                Сотрудник
              </th>
              <th className="sticky z-20 bg-charcoal px-2 py-2 text-center text-text-tertiary font-medium border-r border-border-luxury/60"
                style={{ left: 160, minWidth: 80 }}>
                Отдел
              </th>
              <th className="sticky z-20 bg-charcoal px-2 py-2 text-center text-text-tertiary font-medium border-r border-border-luxury/60"
                style={{ left: 240, minWidth: 90 }}>
                Статус
              </th>
              {cols.map(({ d, dateStr, dow }) => (
                <th key={dateStr}
                  className={cn(
                    'py-1 text-center border-r border-border-luxury/30 font-medium',
                    alertSet.has(dateStr)
                      ? 'bg-red-900/40 text-red-300'
                      : (dow === 0 || dow === 6)
                      ? 'bg-charcoal text-text-tertiary/40'
                      : 'bg-charcoal text-text-tertiary'
                  )}
                  style={{ width: 28 }}>
                  <div className="text-[10px] font-semibold leading-none">{d}</div>
                  <div className="text-[8px] opacity-60 leading-none mt-0.5">{DOW_SHORT[dow]}</div>
                </th>
              ))}
              <th className="bg-charcoal px-2 py-2 text-center text-text-tertiary font-medium"
                style={{ minWidth: 44 }}>
                ∑
              </th>
            </tr>
          </thead>
          {/* Data rows */}
          <tbody>
            {data.requests.map((r) => {
              const dayMap: Record<string, boolean> = {};
              for (const d of r.days) dayMap[d.date] = d.isWorkDay;
              return (
                <tr key={r.id}
                  onClick={() => onReview(r)}
                  className="cursor-pointer hover:brightness-110 transition-all border-b border-border-luxury/20">
                  <td className="sticky left-0 z-10 bg-charcoal px-3 py-2 font-medium text-text-primary whitespace-nowrap border-r border-border-luxury/40">
                    {r.specialistName}
                  </td>
                  <td className="sticky z-10 bg-charcoal px-2 py-2 text-center border-r border-border-luxury/40"
                    style={{ left: 160 }}>
                    <DeptBadge dept={r.department} />
                  </td>
                  <td className="sticky z-10 bg-charcoal px-2 py-2 text-center border-r border-border-luxury/40"
                    style={{ left: 240 }}>
                    <StatusBadge status={r.status} />
                  </td>
                  {cols.map(({ dateStr }) => {
                    const isWork = dayMap[dateStr];
                    const isAlert = !!isWork && alertSet.has(dateStr);
                    let cellCls = '';
                    let printCls = '';
                    if (isWork === undefined) {
                      cellCls = 'bg-charcoal/20';
                    } else if (!isWork) {
                      cellCls = 'bg-charcoal/40';
                    } else if (r.status === 'APPROVED') {
                      cellCls = isAlert ? 'bg-red-700/60' : 'bg-emerald-800/60';
                      printCls = isAlert ? 'work-alert' : 'work-approved';
                    } else if (r.status === 'REJECTED') {
                      cellCls = 'bg-red-900/25';
                    } else {
                      cellCls = isAlert ? 'bg-red-700/40' : 'bg-amber-700/50';
                      printCls = isAlert ? 'work-alert' : 'work-pending';
                    }
                    return (
                      <td key={dateStr}
                        className={cn('border-r border-border-luxury/10', cellCls, printCls)}
                        style={{ width: 28, height: 32 }}
                      />
                    );
                  })}
                  <td className="bg-charcoal px-2 py-2 text-center font-bold text-text-primary">
                    {r.workDayCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Coverage footer */}
          <tfoot>
            {(['MASSAGE', 'COSMETOLOGY'] as const).map((dept) => (
              <tr key={dept} className="border-t-2 border-border-luxury">
                <td colSpan={3}
                  className="sticky left-0 z-10 bg-charcoal px-3 py-1.5 text-[10px] font-semibold text-text-secondary whitespace-nowrap border-r border-border-luxury/40">
                  {dept === 'MASSAGE' ? 'Массажисты' : 'Косметологи'}
                </td>
                {cols.map(({ dateStr }) => {
                  const count = data.coverage[dateStr]?.[dept] ?? 0;
                  const isShort = count > 0 && count < MIN_STAFF;
                  return (
                    <td key={dateStr}
                      className={cn(
                        'text-center text-[10px] font-bold border-r border-border-luxury/20',
                        count === 0
                          ? 'bg-charcoal text-text-tertiary/25 cover-zero'
                          : isShort
                          ? 'bg-red-900/30 text-red-300 cover-short'
                          : 'bg-charcoal text-emerald-400 cover-ok'
                      )}
                      style={{ width: 28 }}>
                      {count > 0 ? count : ''}
                    </td>
                  );
                })}
                <td className="bg-charcoal" />
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-text-tertiary flex-wrap px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-800/60 inline-block border border-emerald-700/30" />
          Рабочий (одобрено)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-700/50 inline-block border border-amber-600/30" />
          Рабочий (ожидает)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-700/50 inline-block border border-red-600/30" />
          Недобор
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-charcoal/40 inline-block border border-border-luxury/40" />
          Выходной
        </span>
        <span className="text-text-tertiary/60">Нажмите на строку — открыть заявку</span>
      </div>
    </div>
  );
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab() {
  const months = upcomingMonths(4);
  const [selectedMonth, setSelectedMonth] = React.useState(months[0]);
  const [data, setData] = React.useState<ScheduleTabData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [reviewing, setReviewing] = React.useState<ScheduleRequest | null>(null);
  const [view, setView] = React.useState<'cards' | 'table'>('cards');

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

          {/* View toggle + content */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-tertiary">{data.requests.length} заявок</p>
            <div className="flex gap-0.5 p-0.5 bg-charcoal/50 rounded-lg border border-border-luxury">
              <button onClick={() => setView('cards')} title="Карточки"
                className={cn('p-1.5 rounded transition-colors',
                  view === 'cards' ? 'bg-onyx text-champagne' : 'text-text-tertiary hover:text-text-primary')}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView('table')} title="Таблица"
                className={cn('p-1.5 rounded transition-colors',
                  view === 'table' ? 'bg-onyx text-champagne' : 'text-text-tertiary hover:text-text-primary')}>
                <Table2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {view === 'table' ? (
            <ScheduleTable data={data} month={selectedMonth} onReview={setReviewing} />
          ) : (
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
          )}
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
