'use client';

import * as React from 'react';
import { X, Download, Plus, Trash2, CheckSquare, RefreshCw, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface EntryRow {
  id: string; saleDate: string; clientName: string; services: string;
  clientType: string; saleTotal: number; roleOnSale: string;
  commissionType: string; commissionBasis: number; commissionAmount: number;
  isManuallyEdited: boolean; status: string; notes: string;
}
interface Adjustment { id: string; description: string; amount: number; createdAt: string; }

interface Props {
  userId: string;
  name: string;
  role: string;
  department: string | null;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() {
  return new Date().toLocaleDateString('en-CA');
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  PAID:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Ожидает', APPROVED: 'Утверждено', PAID: 'Выплачено',
};
const CLIENT_TYPE_LABEL: Record<string, string> = {
  NEW: 'Новый', RETURNING: 'Постоянный', SUBSCRIPTION: 'Абонемент',
};
const COMM_TYPE_LABEL: Record<string, string> = {
  FIXED: 'Фикс.', PERCENTAGE: '%', BONUS: 'Бонус',
};

function useDebounce<T>(v: T, ms: number) {
  const [d, setD] = React.useState(v);
  React.useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

// ── Inline editable cell ──────────────────────────────────────────────────────

function EditCell({
  value, type = 'number', onChange,
}: { value: string | number; type?: 'text' | 'number' | 'select'; onChange: (v: string) => void; }) {
  const [editing, setEditing] = React.useState(false);
  const [local, setLocal]     = React.useState(String(value));
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { setLocal(String(value)); }, [value]);
  React.useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className="cursor-pointer hover:text-champagne transition-colors group relative"
        title="Нажмите для редактирования"
      >
        {value}
        <Edit2 className="w-2.5 h-2.5 text-text-tertiary ml-1 inline opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    );
  }
  return (
    <input
      ref={ref}
      type={type === 'number' ? 'number' : 'text'}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { setEditing(false); onChange(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); onChange(local); } }}
      className="w-20 px-1 py-0.5 text-xs rounded border border-champagne/40 bg-onyx text-text-primary focus:outline-none"
    />
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function EmployeePayrollPanel({ userId, name, role, department, onClose }: Props) {
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo]     = React.useState(today());
  const [entries, setEntries]     = React.useState<EntryRow[]>([]);
  const [adjustments, setAdj]     = React.useState<Adjustment[]>([]);
  const [loading, setLoading]     = React.useState(false);
  const [savingId, setSavingId]   = React.useState<string | null>(null);

  // New adjustment form
  const [adjDesc, setAdjDesc]     = React.useState('');
  const [adjAmt,  setAdjAmt]      = React.useState('');
  const [adjSaving, setAdjSaving] = React.useState(false);

  const totalComm = entries.reduce((s, e) => s + e.commissionAmount, 0);
  const totalAdj  = adjustments.reduce((s, a) => s + a.amount, 0);
  const periodTotal = Math.round((totalComm + totalAdj) * 100) / 100;

  async function load() {
    setLoading(true);
    try {
      const [e, a] = await Promise.all([
        fetch(`/api/payroll/entries?userId=${userId}&from=${from}&to=${to}`, { credentials: 'include' }).then((r) => r.json()),
        fetch(`/api/payroll/period-adjustments?userId=${userId}&from=${from}&to=${to}`, { credentials: 'include' }).then((r) => r.json()),
      ]);
      if (e.success) setEntries(e.data.entries);
      if (a.success) setAdj(a.data.adjustments.map((x: { id: string; description: string; amount: number; createdAt: string }) => ({
        id: x.id, description: x.description, amount: Number(x.amount), createdAt: x.createdAt,
      })));
    } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, [from, to]);

  async function patchEntry(id: string, patch: Record<string, unknown>) {
    setSavingId(id);
    try {
      const res  = await fetch(`/api/payroll/entries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(patch) });
      const json = await res.json() as { success: boolean; data?: { commissionAmount: number; isManuallyEdited: boolean } };
      if (json.success && json.data) {
        setEntries((prev) => prev.map((e) =>
          e.id === id ? { ...e, commissionAmount: json.data!.commissionAmount, isManuallyEdited: json.data!.isManuallyEdited } : e,
        ));
      }
    } finally { setSavingId(null); }
  }

  function updateEntryField(id: string, field: string, rawValue: string) {
    const patch: Record<string, unknown> = {};
    if (field === 'commissionAmount') patch.commissionAmount = parseFloat(rawValue) || 0;
    else if (field === 'commissionType')  patch.commissionType  = rawValue;
    else if (field === 'commissionBasis') patch.commissionBasis = parseFloat(rawValue) || 0;
    else if (field === 'status')          patch.status          = rawValue;
    else if (field === 'notes')           patch.notes           = rawValue;
    void patchEntry(id, patch);
    // Optimistically update local state
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, [field]: field === 'commissionAmount' || field === 'commissionBasis' ? parseFloat(rawValue) || 0 : rawValue } : e));
  }

  async function approveAll() {
    const pending = entries.filter((e) => e.status === 'PENDING');
    for (const e of pending) {
      await patchEntry(e.id, { status: 'APPROVED' });
    }
    void load();
  }

  async function addAdjustment() {
    if (!adjDesc.trim() || adjAmt === '') return;
    setAdjSaving(true);
    try {
      const res  = await fetch('/api/payroll/period-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, periodStart: from, periodEnd: to, description: adjDesc, amount: parseFloat(adjAmt) }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) { setAdjDesc(''); setAdjAmt(''); void load(); }
    } finally { setAdjSaving(false); }
  }

  async function deleteAdj(id: string) {
    await fetch(`/api/payroll/period-adjustments/${id}`, { method: 'DELETE', credentials: 'include' });
    void load();
  }

  function exportXlsx() {
    window.open(`/api/payroll/entries/export?userId=${userId}&from=${from}&to=${to}`, '_blank');
  }

  const inputCls = 'px-2 py-1.5 rounded-lg bg-charcoal border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-champagne/40';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-4xl bg-obsidian border-l border-border-luxury h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-luxury shrink-0">
          <div>
            <h2 className="font-serif text-xl text-text-primary">{name}</h2>
            <p className="text-sm text-text-tertiary mt-0.5">{role}{department ? ` · ${department}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportXlsx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal border border-border-luxury text-text-secondary text-xs hover:text-text-primary transition-colors">
              <Download className="w-3.5 h-3.5" /> XLSX
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border-luxury shrink-0 flex-wrap">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <span className="text-text-tertiary text-xs">—</span>
          <input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   className={inputCls} />
          <button onClick={() => void load()} className="p-1.5 rounded-lg bg-charcoal border border-border-luxury text-text-tertiary hover:text-text-primary transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Комиссия</p>
              <p className="text-sm font-medium text-champagne">{fmt(totalComm)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary">К выплате</p>
              <p className="text-base font-semibold text-champagne">{fmt(periodTotal)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Action bar */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border-luxury">
            <button
              onClick={() => void approveAll()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 text-blue-400 text-xs hover:bg-blue-400/20 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Утвердить все
            </button>
            <span className="text-xs text-text-tertiary ml-auto">
              {entries.length} продаж · {entries.filter((e) => e.status === 'PENDING').length} ожидают
            </span>
          </div>

          {/* Entries table */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-sm text-text-tertiary">Нет продаж за выбранный период</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-luxury bg-charcoal/30">
                    {['Дата','Клиент','Услуги','Тип','Сумма','Роль','Тип ком.','База','Комиссия (₽)','Статус','Заметка'].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury/30">
                  {entries.map((e) => (
                    <tr key={e.id} className={cn('hover:bg-white/[0.02] transition-colors', savingId === e.id && 'opacity-50')}>
                      <td className="px-3 py-2.5 text-text-tertiary whitespace-nowrap">{new Date(e.saleDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</td>
                      <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{e.clientName}</td>
                      <td className="px-3 py-2.5 text-text-secondary max-w-[150px] truncate" title={e.services}>{e.services || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-charcoal/40 text-text-tertiary">{CLIENT_TYPE_LABEL[e.clientType] ?? e.clientType}</span>
                      </td>
                      <td className="px-3 py-2.5 text-text-primary tabular-nums whitespace-nowrap">{fmt(e.saleTotal)}</td>
                      <td className="px-3 py-2.5 text-text-tertiary">{e.roleOnSale}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={e.commissionType}
                          onChange={(ev) => updateEntryField(e.id, 'commissionType', ev.target.value)}
                          className="bg-transparent text-xs text-text-primary border-0 focus:outline-none cursor-pointer"
                        >
                          {['FIXED','PERCENTAGE','BONUS'].map((t) => <option key={t} value={t}>{COMM_TYPE_LABEL[t]}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <EditCell value={e.commissionBasis} onChange={(v) => updateEntryField(e.id, 'commissionBasis', v)} />
                      </td>
                      <td className={cn('px-3 py-2.5 tabular-nums font-medium', e.isManuallyEdited ? 'text-amber-400' : 'text-champagne')}>
                        <EditCell value={e.commissionAmount} onChange={(v) => updateEntryField(e.id, 'commissionAmount', v)} />
                        {e.isManuallyEdited && (
                          <button
                            onClick={() => void patchEntry(e.id, { recalculate: true }).then(() => void load())}
                            title="Пересчитать"
                            className="ml-1 text-text-tertiary hover:text-text-primary"
                          >
                            <RefreshCw className="w-2.5 h-2.5 inline" />
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={e.status}
                          onChange={(ev) => updateEntryField(e.id, 'status', ev.target.value)}
                          className={cn('text-[10px] rounded px-1.5 py-0.5 border font-medium focus:outline-none cursor-pointer', STATUS_COLOR[e.status] ?? 'text-text-tertiary bg-charcoal border-border-luxury')}
                        >
                          {['PENDING','APPROVED','PAID'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 max-w-[100px]">
                        <EditCell value={e.notes} type="text" onChange={(v) => updateEntryField(e.id, 'notes', v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Manual adjustments */}
          <div className="px-6 py-5 border-t border-border-luxury mt-2">
            <h3 className="text-sm font-medium text-text-primary mb-3">Корректировки (не привязаны к продаже)</h3>

            {adjustments.length > 0 && (
              <div className="space-y-2 mb-4">
                {adjustments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-charcoal/30 border border-border-luxury">
                    <div>
                      <p className="text-sm text-text-primary">{a.description}</p>
                      <p className="text-[10px] text-text-tertiary">{new Date(a.createdAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('text-sm font-semibold tabular-nums', a.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {a.amount >= 0 ? '+' : ''}{fmt(a.amount)}
                      </span>
                      <button onClick={() => void deleteAdj(a.id)} className="p-1 text-red-400/60 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
                placeholder="Описание (бонус, штраф...)"
                className="flex-1 px-3 py-2 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
              <input
                value={adjAmt}
                onChange={(e) => setAdjAmt(e.target.value)}
                placeholder="Сумма"
                type="number"
                step="0.01"
                className="w-24 px-3 py-2 rounded-lg bg-charcoal border border-border-luxury text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
              <button
                onClick={() => void addAdjustment()}
                disabled={adjSaving || !adjDesc.trim() || adjAmt === ''}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-champagne/10 border border-champagne/30 text-champagne text-sm hover:bg-champagne/20 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Period total */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-champagne/5 border border-champagne/15">
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Итого к выплате</p>
                <p className="text-xs text-text-tertiary mt-0.5">{entries.length} продаж + {adjustments.length} корректировок</p>
              </div>
              <p className="text-2xl font-serif font-medium text-champagne">{fmt(periodTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
