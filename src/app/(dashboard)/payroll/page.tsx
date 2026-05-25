'use client';

import React from 'react';
import {
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  Settings,
  PlusCircle,
  CheckCircle,
  BadgeCheck,
  X,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SalaryType = 'FIXED' | 'HOURLY' | 'SHIFT' | 'HYBRID';
type PayrollStatus = 'PENDING' | 'APPROVED' | 'PAID';
type EntryType = 'BONUS' | 'DEDUCTION' | 'ADJUSTMENT';

interface PayrollRow {
  specialistId: string;
  name: string;
  role: string;
  department: string;
  salaryType: SalaryType;
  workingDays: number;
  completedSessions: number;
  baseSalary: number;
  salesVolume: number;
  totalCommission: number;
  totalBonus: number;
  totalDeduction: number;
  totalAdjustment: number;
  totalPayable: number;
  status: PayrollStatus;
  bonusThresholdSessions: number | null;
  maxDailySessions: number;
  daysOverThreshold: number;
  periodId: string | null;
}

interface PayrollTotals {
  totalPayrollCost: number;
  totalCommission: number;
  totalBaseSalaries: number;
  employeesProcessed: number;
  pendingApproval: number;
}

interface SalaryConfig {
  salaryType: SalaryType;
  fixedAmount: number;
  hourlyRate: number;
  shiftRate: number;
  commissionRate: number;
  bonusThresholdSessions: number | null;
  notes: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toDateInput(d: Date): string {
  return d.toISOString().split('T')[0];
}

function firstOfMonth(): string {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
}

function lastOfLastMonth(): string {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 0));
}

function firstOfLastMonth(): string {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

function threeMonthsAgo(): string {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth() - 3, d.getDate()));
}

function todayStr(): string {
  return toDateInput(new Date());
}

function currentPeriodMonth(): string {
  return toDateInput(new Date()).slice(0, 7) + '-01';
}

const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  FIXED: 'Оклад',
  HOURLY: 'Почасовой',
  SHIFT: 'Сменный',
  HYBRID: 'Смешанный',
};

const STATUS_LABELS: Record<PayrollStatus, string> = {
  PENDING: 'Черновик',
  APPROVED: 'Согласован',
  PAID: 'Выплачен',
};

function getUserRole(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)user_role=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// ─── AddEntryModal ─────────────────────────────────────────────────────────────

interface AddEntryModalProps {
  specialistId: string;
  specialistName: string;
  defaultType: EntryType;
  periodMonth: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddEntryModal({
  specialistId,
  specialistName,
  defaultType,
  periodMonth,
  onClose,
  onSaved,
}: AddEntryModalProps) {
  const [type, setType] = React.useState<EntryType>(defaultType);
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [period, setPeriod] = React.useState(periodMonth);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/payroll/${specialistId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: parsed, description, periodMonth: period }),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Ошибка сохранения');
        return;
      }
      onSaved();
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-charcoal border border-border-luxury rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-luxury/60">
          <h2 className="text-base font-semibold text-text-primary">
            {type === 'BONUS' ? 'Добавить бонус' : type === 'DEDUCTION' ? 'Добавить удержание' : 'Добавить корректировку'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-text-muted">Сотрудник: <span className="text-text-primary">{specialistName}</span></p>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Тип</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EntryType)}
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            >
              <option value="BONUS">Бонус</option>
              <option value="DEDUCTION">Удержание</option>
              <option value="ADJUSTMENT">Корректировка</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Сумма</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Причина / комментарий"
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Период (месяц)</label>
            <input
              type="month"
              value={period.slice(0, 7)}
              onChange={(e) => setPeriod(e.target.value + '-01')}
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:border-border-light transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-champagne text-obsidian text-sm font-medium hover:bg-champagne/90 disabled:opacity-50 transition-all"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SalaryConfigModal ─────────────────────────────────────────────────────────

interface SalaryConfigModalProps {
  specialistId: string;
  specialistName: string;
  department: string;
  onClose: () => void;
  onSaved: () => void;
}

function SalaryConfigModal({
  specialistId,
  specialistName,
  department,
  onClose,
  onSaved,
}: SalaryConfigModalProps) {
  const [config, setConfig] = React.useState<SalaryConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/v1/specialists/${specialistId}/salary-config`);
        const json = await res.json() as { success: boolean; data: SalaryConfig | null; error?: { message?: string } };
        if (!res.ok || !json.success) {
          setError(json.error?.message ?? 'Ошибка загрузки конфигурации');
          return;
        }
        if (json.data) {
          setConfig({
            salaryType: json.data.salaryType,
            fixedAmount: json.data.fixedAmount,
            hourlyRate: json.data.hourlyRate,
            shiftRate: json.data.shiftRate,
            commissionRate: Math.round(Number(json.data.commissionRate) * 100),
            bonusThresholdSessions: json.data.bonusThresholdSessions,
            notes: json.data.notes ?? '',
          });
        } else {
          setConfig({
            salaryType: 'FIXED',
            fixedAmount: 0,
            hourlyRate: 0,
            shiftRate: 0,
            commissionRate: 30,
            bonusThresholdSessions: null,
            notes: '',
          });
        }
      } catch {
        setError('Ошибка сети');
      } finally {
        setLoadingConfig(false);
      }
    }
    void loadConfig();
  }, [specialistId]);

  function update<K extends keyof SalaryConfig>(key: K, value: SalaryConfig[K]) {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/specialists/${specialistId}/salary-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, commissionRate: config.commissionRate / 100 }),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Ошибка сохранения');
        return;
      }
      onSaved();
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  const isMassage = department?.toUpperCase() === 'MASSAGE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-charcoal border border-border-luxury rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-luxury/60 sticky top-0 bg-charcoal z-10">
          <h2 className="text-base font-semibold text-text-primary">Настройка оклада — {specialistName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loadingConfig ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-champagne" />
            </div>
          ) : !config ? (
            <div className="text-sm text-red-400 py-4">{error || 'Не удалось загрузить конфигурацию'}</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
              )}

              {/* Salary type */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-muted">Тип оплаты</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['FIXED', 'HOURLY', 'SHIFT', 'HYBRID'] as SalaryType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update('salaryType', t)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                        config.salaryType === t
                          ? 'border-champagne/50 bg-champagne/10 text-champagne'
                          : 'border-border-luxury text-text-muted hover:text-text-secondary',
                      )}
                    >
                      {SALARY_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed amount */}
              {(config.salaryType === 'FIXED' || config.salaryType === 'HYBRID') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted">Фиксированная сумма</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.fixedAmount}
                    onChange={(e) => update('fixedAmount', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                  />
                </div>
              )}

              {/* Hourly rate */}
              {config.salaryType === 'HOURLY' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted">Ставка в час</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.hourlyRate}
                    onChange={(e) => update('hourlyRate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                  />
                </div>
              )}

              {/* Shift rate */}
              {config.salaryType === 'SHIFT' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted">Ставка за смену</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.shiftRate}
                    onChange={(e) => update('shiftRate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                  />
                </div>
              )}

              {/* Commission rate — always visible */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">Комиссия (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={config.commissionRate}
                    onChange={(e) => update('commissionRate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">%</span>
                </div>
              </div>

              {/* Bonus threshold — massage only */}
              {isMassage && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted">Порог сессий/день</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={config.bonusThresholdSessions ?? ''}
                    onChange={(e) =>
                      update('bonusThresholdSessions', e.target.value === '' ? null : parseInt(e.target.value, 10))
                    }
                    placeholder="Не задан"
                    className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">Заметки</label>
                <textarea
                  rows={3}
                  value={config.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Дополнительная информация..."
                  className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-champagne/40"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:border-border-light transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-champagne text-obsidian text-sm font-medium hover:bg-champagne/90 disabled:opacity-50 transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Сохранить
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PayrollStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
        status === 'PENDING'  && 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
        status === 'APPROVED' && 'bg-sky-400/10 text-sky-400 border border-sky-400/20',
        status === 'PAID'     && 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-border-luxury text-text-muted">
      {role}
    </span>
  );
}

// ─── Expanded row ──────────────────────────────────────────────────────────────

interface ExpandedRowProps {
  row: PayrollRow;
  isAdmin: boolean;
  from: string;
  to: string;
  onAddBonus: () => void;
  onAddDeduction: () => void;
  onConfigSalary: () => void;
  onStatusChange: (status: PayrollStatus) => Promise<void>;
  statusChanging: boolean;
}

function ExpandedRow({
  row,
  isAdmin,
  from,
  to,
  onAddBonus,
  onAddDeduction,
  onConfigSalary,
  onStatusChange,
  statusChanging,
}: ExpandedRowProps) {
  return (
    <div className="px-5 py-4 bg-obsidian/30 border-t border-border-luxury/30 space-y-4">
      {/* Salary config summary */}
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <span>Период: <span className="text-text-secondary">{from} — {to}</span></span>
        <span>Тип оплаты: <span className="text-text-secondary">{SALARY_TYPE_LABELS[row.salaryType]}</span></span>
        <span>Рабочих дней: <span className="text-text-secondary">{row.workingDays}</span></span>
        <span>Продажи: <span className="text-text-secondary">{formatCurrency(row.salesVolume)}</span></span>
        {row.totalAdjustment !== 0 && (
          <span>Корректировки: <span className={cn(row.totalAdjustment > 0 ? 'text-emerald-400' : 'text-red-400')}>{formatCurrency(row.totalAdjustment)}</span></span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddBonus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/5 text-emerald-400 text-xs font-medium hover:bg-emerald-400/10 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Добавить бонус
        </button>

        <button
          type="button"
          onClick={onAddDeduction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-400/30 bg-red-400/5 text-red-400 text-xs font-medium hover:bg-red-400/10 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Добавить удержание
        </button>

        <button
          type="button"
          onClick={onConfigSalary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-luxury text-text-muted text-xs font-medium hover:text-text-secondary hover:border-border-light transition-all"
        >
          <Settings className="w-3.5 h-3.5" />
          Настроить оклад
        </button>

        {/* Admin-only status transitions */}
        {isAdmin && row.status === 'PENDING' && (
          <button
            type="button"
            disabled={statusChanging}
            onClick={() => onStatusChange('APPROVED')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/30 bg-sky-400/5 text-sky-400 text-xs font-medium hover:bg-sky-400/10 disabled:opacity-50 transition-all"
          >
            {statusChanging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Согласовать
          </button>
        )}

        {isAdmin && row.status === 'APPROVED' && (
          <button
            type="button"
            disabled={statusChanging}
            onClick={() => onStatusChange('PAID')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/5 text-emerald-400 text-xs font-medium hover:bg-emerald-400/10 disabled:opacity-50 transition-all"
          >
            {statusChanging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
            Отметить выплаченным
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="px-5 py-4 grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center animate-pulse">
      <div className="space-y-2">
        <div className="h-3.5 w-28 rounded bg-white/5" />
        <div className="h-3 w-16 rounded bg-white/5" />
      </div>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="hidden lg:block h-3.5 rounded bg-white/5" />
      ))}
      <div className="hidden lg:block h-5 w-16 rounded-full bg-white/5" />
      <div className="hidden lg:block h-5 w-5 rounded bg-white/5" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface ModalState {
  type: 'add-entry' | 'salary-config';
  specialistId: string;
  specialistName: string;
  department: string;
  entryType?: EntryType;
}

export default function PayrollPage() {
  const [from, setFrom] = React.useState(firstOfMonth());
  const [to, setTo] = React.useState(todayStr());
  const [rows, setRows] = React.useState<PayrollRow[]>([]);
  const [totals, setTotals] = React.useState<PayrollTotals | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [calculating, setCalculating] = React.useState(false);
  const [error, setError] = React.useState('');
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [modal, setModal] = React.useState<ModalState | null>(null);
  const [statusChanging, setStatusChanging] = React.useState<Set<string>>(new Set());
  const [exporting, setExporting] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const role = getUserRole();
    setIsAdmin(role === 'ADMIN' || role === 'admin');
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/payroll?from=${from}&to=${to}`);
      const json = await res.json() as { success: boolean; data: { rows: PayrollRow[]; totals: PayrollTotals }; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Ошибка загрузки');
        return;
      }
      setRows(json.data.rows);
      setTotals(json.data.totals);
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  async function handleCalculate() {
    setError('');
    setCalculating(true);
    try {
      const res = await fetch('/api/v1/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Ошибка расчёта');
        return;
      }
      await loadData();
    } catch {
      setError('Ошибка сети');
    } finally {
      setCalculating(false);
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/payroll/export?from=${from}&to=${to}&format=csv`);
      if (!res.ok) {
        setError('Ошибка экспорта');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Ошибка сети');
    } finally {
      setExporting(false);
    }
  }

  async function handleStatusChange(specialistId: string, status: PayrollStatus) {
    setStatusChanging((s) => new Set(s).add(specialistId));
    try {
      const res = await fetch(`/api/v1/payroll/${specialistId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, from, to }),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Ошибка обновления статуса');
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.specialistId === specialistId ? { ...r, status } : r)),
      );
    } catch {
      setError('Ошибка сети');
    } finally {
      setStatusChanging((s) => {
        const n = new Set(s);
        n.delete(specialistId);
        return n;
      });
    }
  }

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function setPreset(presetFrom: string, presetTo: string) {
    setFrom(presetFrom);
    setTo(presetTo);
  }

  const presets = [
    { label: 'Этот месяц', from: firstOfMonth(), to: todayStr() },
    { label: 'Прошлый месяц', from: firstOfLastMonth(), to: lastOfLastMonth() },
    { label: '3 месяца', from: threeMonthsAgo(), to: todayStr() },
  ];

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Зарплатная ведомость</h1>
            <p className="text-sm text-text-muted mt-0.5">Комиссии и выплаты по сотрудникам</p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:border-border-light disabled:opacity-40 transition-all self-start"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Экспорт CSV
          </button>
        </div>

        {/* Period bar */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted">С</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted">По</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPreset(p.from, p.to)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                    from === p.from && to === p.to
                      ? 'border-champagne/50 bg-champagne/10 text-champagne'
                      : 'border-border-luxury text-text-muted hover:text-text-secondary hover:border-border-light',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCalculate}
              disabled={calculating || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-champagne text-obsidian text-sm font-semibold hover:bg-champagne/90 disabled:opacity-50 transition-all"
            >
              {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Рассчитать
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* KPI strip */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4 space-y-2">
              <DollarSign className="w-5 h-5 text-champagne" />
              <p className="text-xl font-semibold text-champagne tabular-nums">{formatCurrency(totals.totalPayrollCost)}</p>
              <p className="text-xs text-text-muted">Итого к выплате</p>
            </div>
            <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4 space-y-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <p className="text-xl font-semibold text-sky-400 tabular-nums">{formatCurrency(totals.totalBaseSalaries)}</p>
              <p className="text-xs text-text-muted">Базовые оклады</p>
            </div>
            <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4 space-y-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <p className="text-xl font-semibold text-emerald-400 tabular-nums">{formatCurrency(totals.totalCommission)}</p>
              <p className="text-xs text-text-muted">Комиссии</p>
            </div>
            <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4 space-y-2">
              <Users className="w-5 h-5 text-text-secondary" />
              <p className="text-xl font-semibold text-text-primary tabular-nums">{totals.employeesProcessed}</p>
              <p className="text-xs text-text-muted">Обработано сотрудников</p>
            </div>
            <div className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4 space-y-2">
              <CheckCircle className="w-5 h-5 text-amber-400" />
              <p className="text-xl font-semibold text-amber-400 tabular-nums">{totals.pendingApproval}</p>
              <p className="text-xs text-text-muted">Ожидают согласования</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden">
          {/* Column headers — desktop */}
          <div className="hidden lg:grid gap-3 px-5 py-3 border-b border-border-luxury/60 text-xs font-medium text-text-muted uppercase tracking-wider"
            style={{ gridTemplateColumns: '2fr 0.6fr 0.8fr 0.7fr 1fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 0.9fr auto' }}
          >
            <span>Сотрудник</span>
            <span className="text-center">Дни</span>
            <span className="text-center">Сессии</span>
            <span className="text-center">Тип</span>
            <span className="text-right">База</span>
            <span className="text-right">Продажи</span>
            <span className="text-right">Комиссия</span>
            <span className="text-right">Бонусы</span>
            <span className="text-right">Удержания</span>
            <span className="text-right">Итого</span>
            <span className="text-center">Статус</span>
            <span className="w-6" />
          </div>

          {loading ? (
            <div className="divide-y divide-border-luxury/40">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <DollarSign className="w-10 h-10 text-text-muted mb-4" />
              <p className="text-sm font-medium text-text-primary">Нет данных за период</p>
              <p className="text-xs text-text-muted mt-1">Нажмите «Рассчитать» для расчёта зарплат</p>
            </div>
          ) : (
            <div className="divide-y divide-border-luxury/40">
              {rows.map((row) => {
                const isExpanded = expanded.has(row.specialistId);
                const isStatusChanging = statusChanging.has(row.specialistId);
                const showThresholdBadge =
                  row.daysOverThreshold > 0 && row.bonusThresholdSessions !== null;

                return (
                  <div key={row.specialistId}>
                    {/* Main row */}
                    <div
                      className="hidden lg:grid gap-3 px-5 py-4 hover:bg-white/[0.015] transition-colors items-center"
                      style={{ gridTemplateColumns: '2fr 0.6fr 0.8fr 0.7fr 1fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 0.9fr auto' }}
                    >
                      {/* Сотрудник */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-text-primary leading-tight">{row.name}</p>
                        <RoleBadge role={row.role} />
                      </div>

                      {/* Дни */}
                      <p className="text-sm text-center text-text-secondary tabular-nums">{row.workingDays}</p>

                      {/* Сессии */}
                      <div
                        className={cn(
                          'text-center',
                          showThresholdBadge && 'bg-amber-400/10 rounded-lg py-0.5',
                        )}
                      >
                        <p className={cn('text-sm tabular-nums', showThresholdBadge ? 'text-amber-400' : 'text-text-secondary')}>
                          {row.completedSessions}
                        </p>
                        {showThresholdBadge && (
                          <span
                            className="text-[10px] text-amber-400/80"
                            title={`${row.daysOverThreshold} дней с ≥ ${row.bonusThresholdSessions ?? ''} сессиями`}
                          >
                            {row.daysOverThreshold} дн ≥ {row.bonusThresholdSessions}
                          </span>
                        )}
                      </div>

                      {/* Тип */}
                      <p className="text-xs text-center text-text-muted">{SALARY_TYPE_LABELS[row.salaryType]}</p>

                      {/* База */}
                      <p className="text-sm text-right text-text-secondary tabular-nums">{formatCurrency(row.baseSalary)}</p>

                      {/* Продажи */}
                      <p className="text-sm text-right text-text-muted tabular-nums">{formatCurrency(row.salesVolume)}</p>

                      {/* Комиссия */}
                      <p className="text-sm text-right text-emerald-400 tabular-nums">{formatCurrency(row.totalCommission)}</p>

                      {/* Бонусы */}
                      <p className={cn('text-sm text-right tabular-nums', row.totalBonus > 0 ? 'text-champagne' : 'text-text-muted')}>
                        {row.totalBonus > 0 ? formatCurrency(row.totalBonus) : '—'}
                      </p>

                      {/* Удержания */}
                      <p className={cn('text-sm text-right tabular-nums', row.totalDeduction > 0 ? 'text-red-400' : 'text-text-muted')}>
                        {row.totalDeduction > 0 ? formatCurrency(row.totalDeduction) : '—'}
                      </p>

                      {/* Итого */}
                      <p className="text-sm text-right font-semibold text-sky-400 tabular-nums">{formatCurrency(row.totalPayable)}</p>

                      {/* Статус */}
                      <div className="flex justify-center">
                        <StatusBadge status={row.status} />
                      </div>

                      {/* Expand */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.specialistId)}
                        className="flex items-center justify-center w-6 h-6 rounded-md text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                        aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden px-5 py-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-text-primary">{row.name}</p>
                          <RoleBadge role={row.role} />
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={row.status} />
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.specialistId)}
                            className="p-1 rounded-md text-text-muted hover:text-text-primary transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-text-muted">Сессии: </span><span className="text-text-secondary">{row.completedSessions}</span></div>
                        <div><span className="text-text-muted">Дни: </span><span className="text-text-secondary">{row.workingDays}</span></div>
                        <div><span className="text-text-muted">База: </span><span className="text-text-secondary">{formatCurrency(row.baseSalary)}</span></div>
                        <div><span className="text-text-muted">Комиссия: </span><span className="text-emerald-400">{formatCurrency(row.totalCommission)}</span></div>
                        {row.totalBonus > 0 && (
                          <div><span className="text-text-muted">Бонусы: </span><span className="text-champagne">{formatCurrency(row.totalBonus)}</span></div>
                        )}
                        {row.totalDeduction > 0 && (
                          <div><span className="text-text-muted">Удержания: </span><span className="text-red-400">{formatCurrency(row.totalDeduction)}</span></div>
                        )}
                        <div className="col-span-2"><span className="text-text-muted">Итого: </span><span className="font-semibold text-sky-400">{formatCurrency(row.totalPayable)}</span></div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <ExpandedRow
                        row={row}
                        isAdmin={isAdmin}
                        from={from}
                        to={to}
                        onAddBonus={() =>
                          setModal({
                            type: 'add-entry',
                            specialistId: row.specialistId,
                            specialistName: row.name,
                            department: row.department,
                            entryType: 'BONUS',
                          })
                        }
                        onAddDeduction={() =>
                          setModal({
                            type: 'add-entry',
                            specialistId: row.specialistId,
                            specialistName: row.name,
                            department: row.department,
                            entryType: 'DEDUCTION',
                          })
                        }
                        onConfigSalary={() =>
                          setModal({
                            type: 'salary-config',
                            specialistId: row.specialistId,
                            specialistName: row.name,
                            department: row.department,
                          })
                        }
                        onStatusChange={(status) => handleStatusChange(row.specialistId, status)}
                        statusChanging={isStatusChanging}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'add-entry' && (
        <AddEntryModal
          specialistId={modal.specialistId}
          specialistName={modal.specialistName}
          defaultType={modal.entryType ?? 'BONUS'}
          periodMonth={currentPeriodMonth()}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void loadData();
          }}
        />
      )}

      {modal?.type === 'salary-config' && (
        <SalaryConfigModal
          specialistId={modal.specialistId}
          specialistName={modal.specialistName}
          department={modal.department}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void loadData();
          }}
        />
      )}
    </div>
  );
}
