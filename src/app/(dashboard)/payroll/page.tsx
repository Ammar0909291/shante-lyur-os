'use client';

import * as React from 'react';
import {
  DollarSign, TrendingUp, Users, Calendar, Download,
  CheckCircle, AlertTriangle, X,
  Briefcase, Plus, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Specialist { id: string; firstName: string; lastName: string; }
interface PayrollRecord {
  id: string; specialistId: string; specialistName: string;
  periodStart: string; periodEnd: string; compensationType: string;
  baseSalary: number; totalCommission: number; totalBonuses: number;
  totalPenalties: number; totalDeductions: number; netPayable: number;
  status: string; completedApts: number; totalRevenue: number;
  workingDays: number | null; workedHours: number | null; notes: string | null;
  approvedAt: string | null; paidAt: string | null; createdAt: string;
  adjustments: { id: string; type: string; amount: number; reason: string | null }[];
}
interface AttendanceRecord {
  id: string; specialistId: string; specialistName: string;
  date: string; status: string; checkInAt: string | null; checkOutAt: string | null;
  breakMinutes: number; workedHours: number | null; completedApts: number; notes: string | null;
}
interface AnalyticsStat {
  specialistId: string; name: string; compensationType: string;
  revenue: number; paidRevenue: number; laborCost: number;
  roi: number | null; marginPct: number; completedApts: number;
  workedDays: number; workedHours: number; burnoutRisk: string;
  dailyWorkload: number; revenuePerApt: number; revenuePerHour: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Yekaterinburg' });

function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Yekaterinburg' });
}
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Черновик', PENDING_APPROVAL: 'На согласовании',
  APPROVED: 'Утверждён', PAID: 'Выплачен', CANCELLED: 'Отменён',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'text-text-tertiary bg-charcoal/40',
  PENDING_APPROVAL: 'text-amber-400 bg-amber-400/10',
  APPROVED: 'text-blue-400 bg-blue-400/10',
  PAID: 'text-emerald-400 bg-emerald-400/10',
  CANCELLED: 'text-red-400 bg-red-400/10',
};
const ATT_LABEL: Record<string, string> = {
  PRESENT: 'Присутствовал', ABSENT: 'Отсутствовал', LATE: 'Опоздание',
  HALF_DAY: 'Полдня', HOLIDAY: 'Праздник', SICK_LEAVE: 'Больничный', REMOTE: 'Удалённо',
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-charcoal/40 border border-border-luxury p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs uppercase tracking-widest text-text-tertiary">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', accent ?? 'bg-champagne/10')}>
          <Icon className="w-4 h-4 text-champagne" />
        </div>
      </div>
      <p className="text-2xl font-serif font-medium text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

// ─── Calculate + Save Modal ───────────────────────────────────────────────────

function CalcModal({
  specialists,
  onClose,
  onSaved,
}: { specialists: Specialist[]; onClose: () => void; onSaved: () => void }) {
  const [specId, setSpecId] = React.useState('');
  const [from, setFrom]     = React.useState(monthStart());
  const [to, setTo]         = React.useState(today());
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr]       = React.useState('');

  async function calculate(save = false) {
    if (!specId) { setErr('Выберите специалиста'); return; }
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialistId: specId, periodStart: from, periodEnd: to, save }),
      });
      const json = await res.json() as { success: boolean; data: Record<string, unknown>; error?: { message: string } };
      if (!json.success) { setErr(json.error?.message ?? 'Ошибка'); return; }
      setResult(json.data);
      if (save) { onSaved(); onClose(); }
    } catch { setErr('Сетевая ошибка'); }
    finally { setLoading(false); }
  }

  const d = result as {
    specialistName?: string; compensationType?: string; baseSalary?: number;
    totalCommission?: number; netPayable?: number; completedApts?: number;
    totalRevenue?: number; workloadScore?: number; burnoutRisk?: string;
  } | null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h2 className="font-serif text-lg text-text-primary">Расчёт заработной платы</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Специалист</label>
            <select value={specId} onChange={e => setSpecId(e.target.value)}
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary">
              <option value="">— Выберите —</option>
              {specialists.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">С</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">По</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary" />
            </div>
          </div>

          {err && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{err}</p>}

          {d && (
            <div className="rounded-xl bg-champagne/5 border border-champagne/10 p-4 space-y-2">
              <p className="text-sm font-medium text-champagne">{d.specialistName}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-text-tertiary">Тип</span><span className="text-text-primary">{d.compensationType}</span>
                <span className="text-text-tertiary">Оклад</span><span className="text-text-primary">{fmt(d.baseSalary ?? 0)}</span>
                <span className="text-text-tertiary">Комиссия</span><span className="text-text-primary">{fmt(d.totalCommission ?? 0)}</span>
                <span className="text-text-tertiary font-semibold">К выплате</span><span className="text-champagne font-semibold text-sm">{fmt(d.netPayable ?? 0)}</span>
                <span className="text-text-tertiary">Визитов</span><span className="text-text-primary">{d.completedApts}</span>
                <span className="text-text-tertiary">Выручка</span><span className="text-text-primary">{fmt(d.totalRevenue ?? 0)}</span>
                <span className="text-text-tertiary">Загрузка</span>
                <span className={cn('font-medium', d.burnoutRisk === 'HIGH' ? 'text-red-400' : d.burnoutRisk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400')}>
                  {d.workloadScore}% {d.burnoutRisk === 'HIGH' ? '⚠ Перегрузка' : ''}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => void calculate(false)} disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-charcoal border border-border-luxury text-sm text-text-primary hover:bg-white/5 transition-colors disabled:opacity-50">
              {loading ? 'Расчёт...' : 'Рассчитать'}
            </button>
            {d && (
              <button onClick={() => void calculate(true)} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-champagne/10 border border-champagne/20 text-sm text-champagne hover:bg-champagne/15 transition-colors">
                Сохранить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────

function AttModal({ specialists, onClose, onSaved }: { specialists: Specialist[]; onClose: () => void; onSaved: () => void }) {
  const [specId, setSpecId] = React.useState('');
  const [date, setDate]     = React.useState(today());
  const [status, setStatus] = React.useState('PRESENT');
  const [checkIn, setCheckIn] = React.useState('10:00');
  const [checkOut, setCheckOut] = React.useState('20:00');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function save() {
    if (!specId) { setErr('Выберите специалиста'); return; }
    setLoading(true); setErr('');
    try {
      const now = new Date();
      const tz  = 'T00:00:00.000Z';
      const makeTs = (t: string) => new Date(`${date}T${t}:00+05:00`).toISOString();
      const res = await fetch('/api/payroll/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialistId: specId, date, status,
          checkInAt:  status === 'PRESENT' || status === 'LATE' ? makeTs(checkIn)  : null,
          checkOutAt: status === 'PRESENT' || status === 'LATE' ? makeTs(checkOut) : null,
        }),
      });
      void now; void tz;
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setErr(json.error?.message ?? 'Ошибка'); return; }
      onSaved(); onClose();
    } catch { setErr('Сетевая ошибка'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h2 className="font-serif text-lg text-text-primary">Отметить явку</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Специалист</label>
            <select value={specId} onChange={e => setSpecId(e.target.value)}
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary">
              <option value="">— Выберите —</option>
              {specialists.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Дата</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary">
                {Object.entries(ATT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          {(status === 'PRESENT' || status === 'LATE') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-tertiary mb-1">Приход</label>
                <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                  className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary" />
              </div>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">Уход</label>
                <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                  className="w-full bg-charcoal border border-border-luxury rounded-xl px-3 py-2.5 text-sm text-text-primary" />
              </div>
            </div>
          )}
          {err && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{err}</p>}
          <button onClick={() => void save()} disabled={loading}
            className="w-full py-2.5 rounded-xl bg-champagne/10 border border-champagne/20 text-sm text-champagne hover:bg-champagne/15 transition-colors disabled:opacity-50">
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { t } = useLanguage();
  void t;

  const [tab, setTab] = React.useState<'records' | 'attendance' | 'analytics'>('records');
  const [records, setRecords]       = React.useState<PayrollRecord[]>([]);
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([]);
  const [analytics, setAnalytics]   = React.useState<{
    summary: { totalLaborCost: number; totalRevenue: number; laborCostPct: number; totalPendingPayout: number; activeSpecialists: number };
    insights: { highestEarner: { name: string; laborCost: number } | null; mostProfitable: { name: string; marginPct: number } | null; burnoutRisks: { name: string; dailyWorkload: number }[]; idlePayrollCost: number };
    specialists: AnalyticsStat[];
  } | null>(null);
  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [calcOpen, setCalcOpen] = React.useState(false);
  const [attOpen, setAttOpen]   = React.useState(false);

  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo]     = React.useState(today());

  // Load specialists for dropdowns
  React.useEffect(() => {
    void fetch('/api/specialists?status=ACTIVE&limit=100')
      .then(r => r.json())
      .then((j: { success: boolean; data: { items: { id: string; firstName: string; lastName: string }[] } }) => {
        if (j.success) setSpecialists((j.data.items ?? []).map(s => ({ id: s.id, firstName: s.firstName ?? '', lastName: s.lastName ?? '' })));
      });
  }, []);

  const loadRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/records?from=${from}&to=${to}&limit=100`);
      const j = await res.json() as { success: boolean; data: { records: PayrollRecord[] } };
      if (j.success) setRecords(j.data.records);
    } finally { setLoading(false); }
  }, [from, to]);

  const loadAttendance = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/attendance?from=${from}&to=${to}`);
      const j = await res.json() as { success: boolean; data: { records: AttendanceRecord[] } };
      if (j.success) setAttendance(j.data.records);
    } finally { setLoading(false); }
  }, [from, to]);

  const loadAnalytics = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/analytics?from=${from}&to=${to}`);
      const j = await res.json() as { success: boolean; data: typeof analytics };
      if (j.success) setAnalytics(j.data);
    } finally { setLoading(false); }
  }, [from, to]);

  React.useEffect(() => {
    if (tab === 'records')    void loadRecords();
    if (tab === 'attendance') void loadAttendance();
    if (tab === 'analytics')  void loadAnalytics();
  }, [tab, loadRecords, loadAttendance, loadAnalytics]);

  async function approveRecord(id: string, action: 'approve' | 'pay') {
    await fetch(`/api/payroll/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    void loadRecords();
  }

  function exportPayroll() {
    window.open(`/api/payroll/export?from=${from}&to=${to}`, '_blank');
  }

  const TABS = [
    { key: 'records',    label: 'Ведомости' },
    { key: 'attendance', label: 'Табель' },
    { key: 'analytics',  label: 'Аналитика' },
  ] as const;

  return (
    <div className="min-h-screen bg-obsidian p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-text-primary">Заработная плата</h1>
          <p className="text-sm text-text-tertiary mt-1">Расчёт комиссий, явка, выплаты</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary" />
          <span className="text-text-tertiary text-xs">—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary" />
          <button onClick={() => {
            if (tab === 'records') void loadRecords();
            if (tab === 'attendance') void loadAttendance();
            if (tab === 'analytics') void loadAnalytics();
          }}
            className="p-2 rounded-xl bg-charcoal border border-border-luxury text-text-tertiary hover:text-text-primary transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setCalcOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne/10 border border-champagne/20 text-sm text-champagne hover:bg-champagne/15 transition-colors">
            <Plus className="w-4 h-4" /> Расчёт
          </button>
          <button onClick={exportPayroll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-charcoal border border-border-luxury text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Download className="w-4 h-4" /> XLSX
          </button>
        </div>
      </div>

      {/* Analytics KPIs (always visible) */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Фонд оплаты труда" value={fmt(analytics.summary.totalLaborCost)} sub={`${analytics.summary.laborCostPct}% от выручки`} icon={DollarSign} />
          <KpiCard label="Выручка (за период)" value={fmt(analytics.summary.totalRevenue)} icon={TrendingUp} />
          <KpiCard label="К выплате" value={fmt(analytics.summary.totalPendingPayout)} sub="утверждённые ведомости" icon={CheckCircle} accent="bg-emerald-400/10" />
          <KpiCard label="Специалистов" value={String(analytics.summary.activeSpecialists)} sub={analytics.insights.burnoutRisks.length > 0 ? `⚠ ${analytics.insights.burnoutRisks.length} риск перегрузки` : 'Без рисков'} icon={Users} accent={analytics.insights.burnoutRisks.length > 0 ? 'bg-red-400/10' : 'bg-champagne/10'} />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-charcoal/30 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-champagne/10 text-champagne' : 'text-text-tertiary hover:text-text-primary')}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Records ── */}
      {tab === 'records' && (
        <div className="space-y-3">
          {loading && <p className="text-sm text-text-tertiary py-4 text-center">Загрузка...</p>}
          {!loading && records.length === 0 && (
            <div className="rounded-2xl bg-charcoal/30 border border-border-luxury p-12 text-center">
              <Briefcase className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-tertiary">Нет ведомостей за выбранный период.</p>
              <p className="text-xs text-text-tertiary/60 mt-1">Нажмите «Расчёт» чтобы создать ведомость.</p>
            </div>
          )}
          {records.map((rec) => (
            <div key={rec.id} className="rounded-2xl bg-charcoal/30 border border-border-luxury p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <p className="font-medium text-text-primary">{rec.specialistName}</p>
                  <p className="text-xs text-text-tertiary">{fmtDate(rec.periodStart)} — {fmtDate(rec.periodEnd)} · {rec.compensationType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLOR[rec.status] ?? 'text-text-tertiary bg-charcoal/40')}>
                    {STATUS_LABEL[rec.status] ?? rec.status}
                  </span>
                  {rec.status === 'DRAFT' && (
                    <button onClick={() => void approveRecord(rec.id, 'approve')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors">
                      Утвердить
                    </button>
                  )}
                  {rec.status === 'APPROVED' && (
                    <button onClick={() => void approveRecord(rec.id, 'pay')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors">
                      Выплачено
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Оклад',       value: fmt(rec.baseSalary) },
                  { label: 'Комиссия',    value: fmt(rec.totalCommission) },
                  { label: 'Бонусы',      value: fmt(rec.totalBonuses),    color: rec.totalBonuses > 0 ? 'text-emerald-400' : undefined },
                  { label: 'Штрафы',      value: fmt(rec.totalPenalties),  color: rec.totalPenalties > 0 ? 'text-red-400' : undefined },
                  { label: 'К выплате',   value: fmt(rec.netPayable),      color: 'text-champagne font-semibold' },
                  { label: 'Визитов',     value: String(rec.completedApts) },
                  { label: 'Выручка',     value: fmt(rec.totalRevenue) },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary/60">{label}</p>
                    <p className={cn('text-sm font-medium mt-0.5', color ?? 'text-text-primary')}>{value}</p>
                  </div>
                ))}
              </div>

              {rec.adjustments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-luxury/50 flex flex-wrap gap-2">
                  {rec.adjustments.map((adj) => (
                    <span key={adj.id} className={cn('text-xs px-2 py-0.5 rounded-full border', adj.amount > 0 ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 'text-red-400 border-red-400/20 bg-red-400/5')}>
                      {adj.amount > 0 ? '+' : ''}{fmt(adj.amount)} {adj.reason ?? adj.type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Attendance ── */}
      {tab === 'attendance' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setAttOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne/10 border border-champagne/20 text-sm text-champagne hover:bg-champagne/15 transition-colors">
              <Plus className="w-4 h-4" /> Отметить явку
            </button>
          </div>
          {loading && <p className="text-sm text-text-tertiary py-4 text-center">Загрузка...</p>}
          {!loading && attendance.length === 0 && (
            <div className="rounded-2xl bg-charcoal/30 border border-border-luxury p-12 text-center">
              <Calendar className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-tertiary">Нет записей явки за выбранный период.</p>
            </div>
          )}
          <div className="overflow-x-auto rounded-2xl border border-border-luxury">
            {attendance.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-charcoal/60">
                  <tr>
                    {['Специалист', 'Дата', 'Статус', 'Приход', 'Уход', 'Часов', 'Визитов'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-text-tertiary font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury/30">
                  {attendance.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-text-primary">{a.specialistName}</td>
                      <td className="px-4 py-3 text-text-secondary">{fmtDate(a.date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full',
                          a.status === 'PRESENT' ? 'text-emerald-400 bg-emerald-400/10' :
                          a.status === 'LATE'    ? 'text-amber-400 bg-amber-400/10' :
                          a.status === 'ABSENT'  ? 'text-red-400 bg-red-400/10' :
                          'text-text-tertiary bg-charcoal/40')}>
                          {ATT_LABEL[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-primary">{a.workedHours !== null ? `${a.workedHours}ч` : '—'}</td>
                      <td className="px-4 py-3 text-text-primary">{a.completedApts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Analytics ── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {loading && <p className="text-sm text-text-tertiary py-4 text-center">Загрузка...</p>}
          {analytics && (
            <>
              {/* Insights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.insights.highestEarner && (
                  <div className="rounded-2xl bg-charcoal/30 border border-border-luxury p-4">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2">Топ по выплатам</p>
                    <p className="text-text-primary font-medium">{analytics.insights.highestEarner.name}</p>
                    <p className="text-champagne text-sm">{fmt(analytics.insights.highestEarner.laborCost)}</p>
                  </div>
                )}
                {analytics.insights.mostProfitable && (
                  <div className="rounded-2xl bg-charcoal/30 border border-border-luxury p-4">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2">Наиболее прибыльный</p>
                    <p className="text-text-primary font-medium">{analytics.insights.mostProfitable.name}</p>
                    <p className="text-emerald-400 text-sm">Маржа {analytics.insights.mostProfitable.marginPct}%</p>
                  </div>
                )}
                <div className="rounded-2xl bg-charcoal/30 border border-border-luxury p-4">
                  <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2">Простой (потери)</p>
                  <p className="text-red-400 font-medium text-lg">{fmt(analytics.insights.idlePayrollCost)}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">из-за недозагрузки</p>
                </div>
              </div>

              {/* Burnout alerts */}
              {analytics.insights.burnoutRisks.length > 0 && (
                <div className="rounded-2xl bg-red-400/5 border border-red-400/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm font-medium text-red-400">Риск перегрузки ({analytics.insights.burnoutRisks.length})</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analytics.insights.burnoutRisks.map((b) => (
                      <span key={b.name} className="text-xs px-2.5 py-1 rounded-full bg-red-400/10 text-red-300">
                        {b.name} — {b.dailyWorkload}ч/день
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specialist table */}
              <div className="overflow-x-auto rounded-2xl border border-border-luxury">
                <table className="w-full text-sm">
                  <thead className="bg-charcoal/60">
                    <tr>
                      {['Специалист', 'Тип', 'Выручка', 'ФОТ', 'Маржа', 'ROI', 'Нагрузка', 'Ч/час', 'Риск'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-text-tertiary font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-luxury/30">
                    {analytics.specialists.map((s) => (
                      <tr key={s.specialistId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-text-tertiary text-xs">{s.compensationType}</td>
                        <td className="px-4 py-3 text-text-primary">{fmt(s.paidRevenue)}</td>
                        <td className="px-4 py-3 text-text-primary">{fmt(s.laborCost)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('font-medium', s.marginPct > 50 ? 'text-emerald-400' : s.marginPct > 20 ? 'text-amber-400' : 'text-red-400')}>
                            {s.marginPct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{s.roi !== null ? `×${s.roi}` : '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">{s.dailyWorkload}ч/д</td>
                        <td className="px-4 py-3 text-text-secondary">{s.revenuePerHour !== null ? fmt(s.revenuePerHour) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full',
                            s.burnoutRisk === 'HIGH'   ? 'text-red-400 bg-red-400/10' :
                            s.burnoutRisk === 'MEDIUM' ? 'text-amber-400 bg-amber-400/10' :
                            'text-emerald-400 bg-emerald-400/10')}>
                            {s.burnoutRisk === 'HIGH' ? 'Перегрузка' : s.burnoutRisk === 'MEDIUM' ? 'Умеренно' : 'Норма'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {calcOpen && <CalcModal specialists={specialists} onClose={() => setCalcOpen(false)} onSaved={() => void loadRecords()} />}
      {attOpen  && <AttModal  specialists={specialists} onClose={() => setAttOpen(false)}  onSaved={() => void loadAttendance()} />}
    </div>
  );
}
