'use client';

import * as React from 'react';
import { X, Download, Plus, Trash2, CheckSquare, RefreshCw, ChevronDown, ChevronUp, Pencil, Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCommissionTypeLabel, getUserRoleLabel, getDepartmentLabel } from '@/lib/labels';
import { useLanguage } from '@/contexts/language';

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
const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING:  'payroll.comm.pending',
  APPROVED: 'payroll.comm.approved',
  PAID:     'payroll.status.paid',
  pending:  'payroll.comm.pending',
  approved: 'payroll.comm.approved',
  paid:     'payroll.status.paid',
};

const BONUS_TYPE_KEYS: Array<{ value: string; labelKey: string }> = [
  { value: 'STANDARD_SALE',    labelKey: 'payroll.bonus.standard' },
  { value: 'NEW_CLIENT',       labelKey: 'payroll.bonus.newClient' },
  { value: 'RETURNING_CLIENT', labelKey: 'payroll.bonus.returningClient' },
  { value: 'TARGET_BONUS',     labelKey: 'payroll.bonus.targetBonus' },
  { value: 'QUALITY_BONUS',    labelKey: 'payroll.bonus.qualityBonus' },
  { value: 'CUSTOM',           labelKey: 'payroll.bonus.custom' },
];

// ── Main Panel ────────────────────────────────────────────────────────────────

export function EmployeePayrollPanel({ specialistId, userId, name, role, department, onClose }: Props) {
  const { t } = useLanguage();
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
  const [bonusPct,      setBonusPct]      = React.useState('5');
  const [bonusSaving,   setBonusSaving]   = React.useState(false);

  // Inline commission edit
  const [editingId,  setEditingId]  = React.useState<string | null>(null);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (commission.isLocked) return;
    setEditingId(commission.id);
    setEditRate(String(commission.commissionBasis));
    setEditAmount(String(commission.commissionAmount));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRate('');
    setEditAmount('');
  }

  async function saveEdit(commission: SaleCommission) {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setEditSaving(true);
    try {
      let res: Response;
      if (commission.payrollEntryId) {
        res = await fetch(`/api/v1/payroll/${specialistId}/entries/${commission.payrollEntryId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ rate, amount: parseFloat(editAmount) || undefined }),
        });
      } else {
        res = await fetch(`/api/payroll/entries/${commission.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ commissionBasis: rate, commissionAmount: parseFloat(editAmount) || undefined }),
        });
      }
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
  const salesVolume = saleCommissions.reduce((s, e) => s + e.saleTotal, 0);

  function applyBonusPct() {
    const pct = parseFloat(bonusPct);
    if (isNaN(pct) || pct <= 0 || salesVolume <= 0) return;
    setBonusAmt(String(Math.round(salesVolume * (pct / 100) * 100) / 100));
  }

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
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{t('payroll.panel.commissionsSummary')}</p>
                <p className="text-sm font-medium text-emerald-400">{fmt(summary.totalSaleCommissions)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{t('payroll.panel.bonusesSummary')}</p>
                <p className="text-sm font-medium text-champagne">{fmt(summary.totalBonuses)}</p>
              </div>
              <div className="text-right border-l border-border-luxury pl-6">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{t('payroll.panel.totalSummary')}</p>
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
                    <span className="text-sm font-semibold text-text-primary">{t('payroll.panel.saleCommissions')}</span>
                    <span className="text-xs text-text-tertiary">{saleCommissions.length} {t('payroll.panel.entries')}</span>
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/25">
                        {pendingCount} {t('payroll.panel.awaiting')}
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
                        <CheckSquare className="w-3 h-3" /> {t('payroll.panel.approveAll')}
                      </button>
                    )}
                    {saleOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </button>

                {saleOpen && (
                  saleCommissions.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-text-tertiary">
                      {t('payroll.panel.noCommissions')}
                      <p className="text-xs text-text-tertiary/60 mt-1">{t('payroll.panel.commissionsHint')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border-luxury bg-charcoal/10">
                            {[t('payroll.col.date'), t('payroll.col.client'), t('payroll.col.services'), t('payroll.col.type'), t('payroll.col.amount'), t('payroll.col.rate'), t('payroll.col.commissionRub'), t('payroll.col.status'), ''].map((h) => (
                              <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-luxury/30">
                          {saleCommissions.map((e) => {
                            const isEditing = editingId === e.id;
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
                                      {STATUS_LABEL_KEYS[e.status] ? t(STATUS_LABEL_KEYS[e.status]) : e.status}
                                    </span>
                                    {e.edited && (
                                      <span
                                        title={e.editedAt ? `${t('payroll.panel.edited')} ${new Date(e.editedAt).toLocaleDateString('ru-RU')}` : t('payroll.panel.edited')}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-violet-400/10 border border-violet-400/20 text-violet-400 font-medium cursor-help"
                                      >
                                        {t('payroll.panel.edited')}
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
                                        title={t('payroll.panel.saveTitle')}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                                        title={t('payroll.panel.cancelTitle')}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : e.isLocked ? (
                                    <span title={t('payroll.panel.periodLocked')}><Lock className="w-3.5 h-3.5 text-text-muted/40" /></span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => startEdit(e)}
                                      className="p-1 rounded text-text-muted/40 hover:text-text-muted transition-colors"
                                      title={t('payroll.panel.editCommission')}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
                    <span className="text-sm font-semibold text-text-primary">{t('payroll.panel.otherBonuses')}</span>
                    <span className="text-xs text-text-tertiary">{bonuses.length} {t('payroll.panel.entries')}</span>
                    {bonusOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBonusForm((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-champagne/30 bg-champagne/5 text-champagne text-xs hover:bg-champagne/10 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> {t('payroll.panel.addBonus')}
                  </button>
                </div>

                {/* Add bonus form */}
                {showBonusForm && (
                  <div className="px-6 py-4 bg-charcoal/30 border-b border-border-luxury space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">{t('payroll.panel.bonusType')}</label>
                        <select
                          value={bonusType}
                          onChange={(e) => setBonusType(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-obsidian border border-border-luxury text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40 [&>option]:bg-obsidian"
                        >
                          {BONUS_TYPE_KEYS.map(({ value, labelKey }) => (
                            <option key={value} value={value}>{t(labelKey)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">{t('payroll.panel.bonusAmount')}</label>
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
                      <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">{t('payroll.panel.bonusDescription')}</label>
                      <input
                        type="text"
                        value={bonusDesc}
                        onChange={(e) => setBonusDesc(e.target.value)}
                        placeholder={t('payroll.panel.bonusDescPlaceholder')}
                        className="w-full px-2.5 py-2 rounded-lg bg-obsidian border border-border-luxury text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                      />
                    </div>

                    {/* Quick % calculator */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-champagne/5 border border-champagne/15">
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider whitespace-nowrap">{t('payroll.panel.pctOfSales')}</span>
                      <div className="relative w-20 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={bonusPct}
                          onChange={(e) => setBonusPct(e.target.value)}
                          className="w-full px-2 py-1 pr-5 rounded-md bg-obsidian border border-champagne/30 text-text-primary text-xs text-right focus:outline-none focus:ring-1 focus:ring-champagne/40"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">%</span>
                      </div>
                      <span className="text-[10px] text-text-tertiary">
                        {salesVolume > 0
                          ? `= ${fmt(Math.round(salesVolume * (parseFloat(bonusPct) || 0) / 100 * 100) / 100)} ₽`
                          : t('payroll.panel.noSales')}
                      </span>
                      <button
                        type="button"
                        onClick={applyBonusPct}
                        disabled={salesVolume <= 0 || !(parseFloat(bonusPct) > 0)}
                        className="ml-auto px-2.5 py-1 rounded-md bg-champagne/15 border border-champagne/30 text-champagne text-[10px] font-medium hover:bg-champagne/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {t('payroll.panel.apply')}
                      </button>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowBonusForm(false)}
                        className="px-4 py-1.5 rounded-lg border border-border-luxury text-text-secondary text-xs hover:text-text-primary transition-colors"
                      >
                        {t('payroll.panel.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void addBonus()}
                        disabled={bonusSaving || !bonusDesc.trim() || bonusAmt === ''}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-champagne text-obsidian text-xs font-medium hover:bg-champagne/90 disabled:opacity-50 transition-colors"
                      >
                        {t('payroll.panel.save')}
                      </button>
                    </div>
                  </div>
                )}

                {bonusOpen && (
                  bonuses.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-text-tertiary">
                      {t('payroll.panel.noBonuses')}
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
                              {STATUS_LABEL_KEYS[b.entryStatus] ? t(STATUS_LABEL_KEYS[b.entryStatus]) : b.entryStatus}
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
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">{t('payroll.panel.grandTotal')}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-text-muted">{t('payroll.panel.salesLabel')} <span className="text-emerald-400 font-medium">{fmt(summary.totalSaleCommissions)}</span></span>
                    <span className="text-xs text-text-muted">{t('payroll.panel.bonusesLabel')} <span className="text-champagne font-medium">{fmt(summary.totalBonuses)}</span></span>
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
