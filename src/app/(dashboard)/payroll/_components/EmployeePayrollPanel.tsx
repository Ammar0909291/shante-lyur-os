'use client';

import * as React from 'react';
import { X, Download, Plus, Trash2, CheckSquare, RefreshCw, ChevronDown, ChevronUp, Pencil, Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCommissionTypeLabel, getUserRoleLabel, getDepartmentLabel } from '@/lib/labels';

// ── Types ────────────────────────────────────────────────────────────────────

interface SaleCommission {
  id:               string;
  payrollEntryId:   string | null;
  date:             string;
  clientName:       string;
  services:         string;
  saleTotal:        number;
  commissionType:   string;
  commissionBasis:  number;
  commissionAmount: number;
  status:           string;
  isLocked:         boolean;
  edited:           boolean;
  editedAt:         string | null;
}
interface BonusEntry {
  id: string; commissionType: string; label: string;
  description: string; amount: number; entryStatus: string; createdAt: string;
}
interface Summary { totalSaleCommissions: number; totalBonuses: number; grandTotal: number; }

interface Props {
  specialistId: string;
  userId:       string;
  name:         string;
  role:         string;
  department:   string | null;
  onClose:      () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() { return new Date().toLocaleDateString('en-CA'); }

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  PAID:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  pending:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  approved: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  paid:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Ожидает', APPROVED: 'Утверждено', PAID: 'Выплачено',
  pending: 'Ожидает', approved: 'Утверждено', paid: 'Выплачено',
};

const BONUS_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'STANDARD_SALE',    label: 'Стандартная' },
  { value: 'NEW_CLIENT',       label: 'Новый клиент' },
  { value: 'RETURNING_CLIENT', label: 'Возврат клиента' },
  { value: 'TARGET_BONUS',     label: 'За план' },
  { value: 'QUALITY_BONUS',    label: 'За качество' },
  { value: 'CUSTOM',           label: 'Особый' },
];

// ── Main Panel ────────────────────────────────────────────────────────────────

export function EmployeePayrollPanel({ specialistId, userId, name, role, department, onClose }: Props) {
  const [from, setFrom] = React.useState(monthStart());
  const [to,   setTo]   = React.useState(today());

  const [saleCommissions, setSaleCommissions] = React.useState<SaleCommission[]>([]);
  const [bonuses,         setBonuses]         = React.useState<BonusEntry[]>([]);
  const [summary,         setSummary]         = React.useState<Summary | null>(null);
  const [loading,         setLoading]         = React.useState(false);

  // Bonus form
  const [showBonusForm, setShowBonusForm] = React.useState(false);
  const [bonusType,     setBonusType]     = React.useState('CUSTOM');
  const [bonusDesc,     setBonusDesc]     = React.useState('');
  const [bonusAmt,      setBonusAmt]      = React.useState('');
  const [bonusSaving,   setBonusSaving]   = React.useState(false);

  // Inline commission edit
  const [editingId,  setEditingId]  = React.useState<string | null>(null);  // payrollEntryId
  const [editRate,   setEditRate]   = React.useState('');
  const [editAmount, setEditAmount] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);

  // Collapse sections
  const [saleOpen,  setSaleOpen]  = React.useState(true);
  const [bonusOpen, setBonusOpen] = React.useState(true);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/v1/payroll/${specialistId}/commissions?from=${from}&to=${to}`, { credentials: 'include' });
      const json = await res.json() as { success: boolean; data: { saleCommissions: SaleCommission[]; bonuses: BonusEntry[]; summary: Summary } };
      if (json.success) {
        setSaleCommissions(json.data.saleCommissions);
        setBonuses(json.data.bonuses);
        setSummary(json.data.summary);
      }
    } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, [from, to]);

  async function approveAll() {
    const pending = saleCommissions.filter((e) => e.status === 'PENDING' || e.status === 'pending');
    for (const e of pending) {
      await fetch(`/api/payroll/entries/${e.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'APPROVED' }),
      });
    }
    void load();
  }

  async function addBonus() {
    if (!bonusDesc.trim() || bonusAmt === '') return;
    setBonusSaving(true);
    try {
      const periodMonth = from.slice(0, 7);
      const res  = await fetch(`/api/v1/payroll/${specialistId}/entries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type:           'BONUS',
          amount:         parseFloat(bonusAmt),
          description:    bonusDesc,
          periodMonth:    periodMonth + '-01',
          commissionType: bonusType,
        }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        setBonusDesc(''); setBonusAmt(''); setBonusType('CUSTOM'); setShowBonusForm(false);
        void load();
      }
    } finally { setBonusSaving(false); }
  }

  async function deleteBonus(id: string) {
    await fetch(`/api/v1/payroll/${specialistId}/entries/${id}`, { method: 'DELETE', credentials: 'include' });
    void load();
  }

  function startEdit(commission: SaleCommission) {
    if (!commission.payrollEntryId || commission.isLocked) return;
    setEditingId(commission.payrollEntryId);
    setEditRate(String(commission.commissionBasis));
    setEditAmount(String(commission.commissionAmount));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRate('');
    setEditAmount('');
  }

  async function saveEdit(commission: SaleCommission) {
    if (!commission.payrollEntryId) return;
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/v1/payroll/${specialistId}/entries/${commission.payrollEntryId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rate, amount: parseFloat(editAmount) || undefined }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        cancelEdit();
        void load();
      }
    } finally { setEditSaving(false); }
  }

  // Auto-recalculate amount when rate changes
  function handleEditRateChange(rateStr: string, saleTotal: number) {
    setEditRate(rateStr);
    const r = parseFloat(rateStr);
    if (!isNaN(r) && r >= 0) {
      setEditAmount(String(Math.round(saleTotal * (r / 100) * 100) / 100));
    }
  }

  function exportXlsx() {
    window.open(`/api/payroll/entries/export?userId=${userId}&from=${from}&to=${to}`, '_blank');
  }

  const inputCls = 'px-2 py-1.5 rounded-lg bg-charcoal border border-border-luxury text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-champagne/40';
  const pendingCount = saleCommissions.filter((e) => e.status === 'PENDING' || e.status === 'pending').length;

  const roleLabel = getUserRoleLabel(role);
  const deptLabel = getDepartmentLabel(department);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-4xl bg-obsidian border-l border-border-luxury h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-luxury shrink-0">
          <div>
            <h2 className="font-serif text-xl text-text-primary">{name}</h2>
            <p className="text-sm text-text-tertiary mt-0.5">
              {roleLabel}{deptLabel ? ` · ${deptLabel}` : ''}
            </p>
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
          {summary && (
            <div className="ml-auto flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Комиссии</p>
                <p className="text-sm font-medium text-emerald-400">{fmt(summary.totalSaleCommissions)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Бонусы</p>
                <p className="text-sm font-medium text-champagne">{fmt(summary.totalBonuses)}</p>
              </div>
              <div className="text-right border-l border-border-luxury pl-6">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Итого</p>
                <p className="text-base font-semibold text-champagne">{fmt(summary.grandTotal)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-0">

              {/* ── Section 1: Комиссии за продажи ── */}
              <div>
                <button
                  type="button"
                  onClick={() => setSaleOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-3.5 border-b border-border-luxury bg-charcoal/20 hover:bg-charcoal/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">Комиссии за продажи</span>
                    <span className="text-xs text-text-tertiary">{saleCommissions.length} записей</span>
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/25">
                        {pendingCount} ожидают
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {pendingCount > 0 && saleOpen && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void approveAll(); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-400/10 border border-sky-400/20 text-sky-400 text-xs hover:bg-sky-400/20 transition-colors"
                      >
                        <CheckSquare className="w-3 h-3" /> Утвердить все
                      </button>
                    )}
                    {saleOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </button>

                {saleOpen && (
                  saleCommissions.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-text-tertiary">
                      Нет комиссий за период.
                      <p className="text-xs text-text-tertiary/60 mt-1">Комиссии появляются автоматически при записи продаж.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border-luxury bg-charcoal/10">
                            {['Дата', 'Клиент', 'Услуги', 'Тип', 'Сумма', 'Ставка', 'Комиссия ₽', 'Статус', ''].map((h) => (
                              <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-luxury/30">
                          {saleCommissions.map((e) => {
                            const isEditing = editingId === e.payrollEntryId && e.payrollEntryId !== null;
                            return (
                              <tr key={e.id} className={cn('transition-colors', isEditing ? 'bg-charcoal/40' : 'hover:bg-white/[0.02]')}>
                                <td className="px-3 py-2.5 text-text-tertiary whitespace-nowrap">
                                  {new Date(e.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                </td>
                                <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{e.clientName}</td>
                                <td className="px-3 py-2.5 text-text-secondary max-w-[140px] truncate" title={e.services}>{e.services || '—'}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-champagne/10 border border-champagne/20 text-champagne/80">
                                    {getCommissionTypeLabel(e.commissionType)}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-text-primary tabular-nums whitespace-nowrap">{fmt(e.saleTotal)}</td>

                                {/* Ставка — editable when in edit mode */}
                                <td className="px-3 py-2.5 tabular-nums">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" min="0" max="100" step="0.5"
                                        value={editRate}
                                        onChange={(ev) => handleEditRateChange(ev.target.value, e.saleTotal)}
                                        className="w-16 px-1.5 py-0.5 rounded bg-obsidian border border-champagne/40 text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-champagne/40"
                                        autoFocus
                                      />
                                      <span className="text-text-muted">%</span>
                                    </div>
                                  ) : (
                                    <span className="text-text-muted">{e.commissionBasis}%</span>
                                  )}
                                </td>

                                {/* Комиссия ₽ — editable when in edit mode */}
                                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                                  {isEditing ? (
                                    <input
                                      type="number" min="0" step="0.01"
                                      value={editAmount}
                                      onChange={(ev) => setEditAmount(ev.target.value)}
                                      className="w-24 px-1.5 py-0.5 rounded bg-obsidian border border-champagne/40 text-emerald-400 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-champagne/40"
                                    />
                                  ) : (
                                    <span className="font-medium text-emerald-400">{fmt(e.commissionAmount)}</span>
                                  )}
                                </td>

                                {/* Status + edited badge */}
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={cn('text-[10px] rounded px-1.5 py-0.5 border font-medium', STATUS_COLOR[e.status] ?? 'text-text-tertiary bg-charcoal border-border-luxury')}>
                                      {STATUS_LABEL[e.status] ?? e.status}
                                    </span>
                                    {e.edited && (
                                      <span
                                        title={e.editedAt ? `Изменено ${new Date(e.editedAt).toLocaleDateString('ru-RU')}` : 'Изменено'}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-violet-400/10 border border-violet-400/20 text-violet-400 font-medium cursor-help"
                                      >
                                        Изменено
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Edit / Lock / Save / Cancel actions */}
                                <td className="px-3 py-2.5">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => void saveEdit(e)}
                                        disabled={editSaving}
                                        className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
                                        title="Сохранить"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                                        title="Отмена"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : e.isLocked ? (
                                    <span title="Период закрыт"><Lock className="w-3.5 h-3.5 text-text-muted/40" /></span>
                                  ) : e.payrollEntryId ? (
                                    <button
                                      type="button"
                                      onClick={() => startEdit(e)}
                                      className="p-1 rounded text-text-muted/40 hover:text-text-muted transition-colors"
                                      title="Редактировать комиссию"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>

              {/* ── Section 2: Другие бонусы ── */}
              <div className="border-t border-border-luxury">
                <div className="flex items-center justify-between px-6 py-3.5 bg-charcoal/20">
                  <button
                    type="button"
                    onClick={() => setBonusOpen((v) => !v)}
                    className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="text-sm font-semibold text-text-primary">Другие бонусы</span>
                    <span className="text-xs text-text-tertiary">{bonuses.length} записей</span>
                    {bonusOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBonusForm((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-champagne/30 bg-champagne/5 text-champagne text-xs hover:bg-champagne/10 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Добавить бонус
                  </button>
                </div>

                {/* Add bonus form */}
                {showBonusForm && (
                  <div className="px-6 py-4 bg-charcoal/30 border-b border-border-luxury space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Тип бонуса</label>
                        <select
                          value={bonusType}
                          onChange={(e) => setBonusType(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-obsidian border border-border-luxury text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40 [&>option]:bg-obsidian"
                        >
                          {BONUS_TYPE_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Сумма ₽</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={bonusAmt}
                          onChange={(e) => setBonusAmt(e.target.value)}
                          placeholder="0"
                          className="w-full px-2.5 py-2 rounded-lg bg-obsidian border border-border-luxury text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Описание</label>
                      <input
                        type="text"
                        value={bonusDesc}
                        onChange={(e) => setBonusDesc(e.target.value)}
                        placeholder="Причина / комментарий"
                        className="w-full px-2.5 py-2 rounded-lg bg-obsidian border border-border-luxury text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowBonusForm(false)}
                        className="px-4 py-1.5 rounded-lg border border-border-luxury text-text-secondary text-xs hover:text-text-primary transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => void addBonus()}
                        disabled={bonusSaving || !bonusDesc.trim() || bonusAmt === ''}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-champagne text-obsidian text-xs font-medium hover:bg-champagne/90 disabled:opacity-50 transition-colors"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}

                {bonusOpen && (
                  bonuses.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-text-tertiary">
                      Нет бонусов за период.
                    </div>
                  ) : (
                    <div className="divide-y divide-border-luxury/30">
                      {bonuses.map((b) => (
                        <div key={b.id} className="flex items-center gap-4 px-6 py-3 hover:bg-white/[0.02] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-champagne/10 border border-champagne/20 text-champagne/80">
                                {b.label}
                              </span>
                              <span className="text-sm text-text-primary truncate">{b.description || '—'}</span>
                            </div>
                            <p className="text-[10px] text-text-tertiary mt-0.5">{new Date(b.createdAt).toLocaleDateString('ru-RU')}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cn('text-[10px] rounded px-1.5 py-0.5 border font-medium', STATUS_COLOR[b.entryStatus] ?? 'text-text-tertiary bg-charcoal border-border-luxury')}>
                              {STATUS_LABEL[b.entryStatus] ?? b.entryStatus}
                            </span>
                            <span className="text-sm font-semibold text-champagne tabular-nums">{fmt(b.amount)}</span>
                            <button
                              type="button"
                              onClick={() => void deleteBonus(b.id)}
                              className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Grand total */}
          {summary && (
            <div className="px-6 py-5 border-t border-border-luxury mt-auto">
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-champagne/5 border border-champagne/15">
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">Итого комиссий</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-text-muted">Продажи: <span className="text-emerald-400 font-medium">{fmt(summary.totalSaleCommissions)}</span></span>
                    <span className="text-xs text-text-muted">Бонусы: <span className="text-champagne font-medium">{fmt(summary.totalBonuses)}</span></span>
                  </div>
                </div>
                <p className="text-2xl font-serif font-medium text-champagne">{fmt(summary.grandTotal)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
