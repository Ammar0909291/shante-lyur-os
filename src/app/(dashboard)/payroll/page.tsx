'use client';

import React from 'react';
import Link from 'next/link';
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
  Award,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { EmployeePayrollPanel } from './_components/EmployeePayrollPanel';

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
              className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40 [&>option]:bg-obsidian [&>option]:text-text-primary"
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
        status === 'PENDING'  && 'bg-white/5 text-text-muted border border-border-luxury',
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
    <tr className="border-b border-border-luxury/30 animate-pulse">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/5 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-white/5" />
            <div className="h-3 w-16 rounded bg-white/5" />
          </div>
        </div>
      </td>
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 rounded bg-white/5" />
        </td>
      ))}
      <td className="px-4 py-3.5">
        <div className="h-5 w-20 rounded-full bg-white/5 mx-auto" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-5 w-5 rounded bg-white/5 ml-auto" />
      </td>
    </tr>
  );
}

// ─── Attendance pct badge ──────────────────────────────────────────────────────

function AttendancePct({ pct }: { pct: number }) {
  const cls =
    pct >= 90 ? 'text-emerald-400 bg-emerald-400/10' :
    pct >= 70 ? 'text-amber-400 bg-amber-400/10' :
                'text-red-400 bg-red-400/10';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${cls}`}>
      {pct.toFixed(0)}%
    </span>
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
  const { t } = useLanguage();
  void t;

  const [tab, setTab] = React.useState<'records' | 'commissions'>('records');
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
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<PayrollStatus | 'ALL'>('ALL');
  const [positionFilter, setPositionFilter] = React.useState('ALL');

  // Commissions tab state
  const [commEmployees, setCommEmployees] = React.useState<{
    userId: string; name: string; role: string; department: string | null;
    specialization: string | null; avatarUrl: string | null;
    totalApproved: number; pendingCount: number; procedureCount: number;
  }[]>([]);
  const [commLoading, setCommLoading] = React.useState(false);
  const [openPanel, setOpenPanel] = React.useState<{ userId: string; name: string; role: string; department: string | null } | null>(null);

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

  const loadCommissions = React.useCallback(async () => {
    setCommLoading(true);
    try {
      const res = await fetch(`/api/payroll/commission-summary?from=${from}&to=${to}`);
      const j = await res.json() as { success: boolean; data: { employees: typeof commEmployees } };
      if (j.success) setCommEmployees(j.data.employees);
    } finally { setCommLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  React.useEffect(() => {
    if (tab === 'commissions') void loadCommissions();
  }, [tab, loadCommissions]);

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

  const filteredRows = rows.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (positionFilter !== 'ALL' && r.role !== positionFilter) return false;
    return true;
  });

  const allPositions = [...new Set(rows.map((r) => r.role))].sort();

  const presets = [
    { label: 'Этот месяц', from: firstOfMonth(), to: todayStr() },
    { label: 'Прошлый месяц', from: firstOfLastMonth(), to: lastOfLastMonth() },
    { label: '3 месяца', from: threeMonthsAgo(), to: todayStr() },
  ];

  const TABS = [
    { key: 'records' as const,     label: 'Ведомости' },
    { key: 'commissions' as const, label: 'Комиссии' },
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
          <div className="flex items-center gap-2">
            {tab === 'commissions' && (
              <button
                type="button"
                onClick={() => void loadCommissions()}
                className="p-2 rounded-xl border border-border-luxury text-text-muted hover:text-text-primary transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting || (tab === 'records' && rows.length === 0)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:border-border-light disabled:opacity-40 transition-all self-start"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Экспорт CSV
          </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-charcoal/40 border border-border-luxury/40 rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-champagne text-obsidian'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Records tab content ── */}
        {tab === 'records' && (<>
        <div className="hidden">{/* records-only content below */}</div>

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

        {/* Toolbar: search + filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск сотрудника..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-charcoal border border-border-luxury text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PayrollStatus | 'ALL')}
            className="rounded-xl border border-border-luxury bg-charcoal px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-1 focus:ring-champagne/40 [&>option]:bg-obsidian [&>option]:text-text-primary"
          >
            <option value="ALL">Все статусы</option>
            <option value="PENDING">Черновик</option>
            <option value="APPROVED">Согласован</option>
            <option value="PAID">Выплачен</option>
          </select>
          {allPositions.length > 1 && (
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="rounded-xl border border-border-luxury bg-charcoal px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-1 focus:ring-champagne/40 [&>option]:bg-obsidian [&>option]:text-text-primary"
            >
              <option value="ALL">Все должности</option>
              {allPositions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {(search || statusFilter !== 'ALL' || positionFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('ALL'); setPositionFilter('ALL'); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-luxury text-text-muted text-xs hover:text-text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Сбросить
            </button>
          )}
          {filteredRows.length !== rows.length && (
            <span className="text-xs text-text-muted ml-auto">
              Показано {filteredRows.length} из {rows.length}
            </span>
          )}
        </div>

        {/* Premium table */}
        <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">

              {/* Grouped column header */}
              <thead>
                <tr className="border-b border-border-luxury/60 bg-obsidian/40">
                  {/* EMPLOYEE */}
                  <th colSpan={1} className="px-4 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest border-r border-border-luxury/30">
                    Сотрудник
                  </th>
                  {/* ATTENDANCE */}
                  <th colSpan={3} className="px-4 py-2 text-center text-[10px] font-semibold text-text-muted uppercase tracking-widest border-r border-border-luxury/30">
                    Посещаемость
                  </th>
                  {/* PERFORMANCE */}
                  <th colSpan={2} className="px-4 py-2 text-center text-[10px] font-semibold text-text-muted uppercase tracking-widest border-r border-border-luxury/30">
                    Показатели
                  </th>
                  {/* EARNINGS */}
                  <th colSpan={3} className="px-4 py-2 text-center text-[10px] font-semibold text-emerald-400/70 uppercase tracking-widest border-r border-border-luxury/30">
                    Начисления
                  </th>
                  {/* DEDUCTIONS */}
                  <th colSpan={2} className="px-4 py-2 text-center text-[10px] font-semibold text-red-400/70 uppercase tracking-widest border-r border-border-luxury/30">
                    Удержания
                  </th>
                  {/* TOTAL + STATUS + ACTIONS */}
                  <th colSpan={3} className="px-4 py-2 text-center text-[10px] font-semibold text-champagne/70 uppercase tracking-widest">
                    Итог
                  </th>
                </tr>
                <tr className="border-b border-border-luxury/40 bg-obsidian/20">
                  {/* Employee */}
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-text-muted border-r border-border-luxury/20 min-w-[200px]">Имя / должность</th>
                  {/* Attendance */}
                  <th className="px-3 py-2.5 text-center text-[11px] font-medium text-text-muted whitespace-nowrap">Раб. дней</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-medium text-text-muted whitespace-nowrap">Отсутств.</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-medium text-text-muted border-r border-border-luxury/20 whitespace-nowrap">Явка %</th>
                  {/* Performance */}
                  <th className="px-3 py-2.5 text-center text-[11px] font-medium text-text-muted whitespace-nowrap">Сессии</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium text-text-muted border-r border-border-luxury/20 whitespace-nowrap">Продажи</th>
                  {/* Earnings */}
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium text-text-muted whitespace-nowrap">База</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium text-emerald-400/80 whitespace-nowrap">Комиссия</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium text-champagne/80 border-r border-border-luxury/20 whitespace-nowrap">Бонусы</th>
                  {/* Deductions */}
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium text-red-400/80 whitespace-nowrap">Удержания</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium text-text-muted border-r border-border-luxury/20 whitespace-nowrap">Корр.</th>
                  {/* Total + Status + Actions */}
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium text-sky-400/90 whitespace-nowrap">Итого ₽</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-medium text-text-muted whitespace-nowrap">Статус</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-medium text-text-muted w-8" />
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-20 text-center">
                      <DollarSign className="w-10 h-10 text-text-muted mb-4 mx-auto" />
                      <p className="text-sm font-medium text-text-primary">
                        {rows.length === 0 ? 'Нет данных за период' : 'Нет результатов по фильтру'}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {rows.length === 0 ? 'Нажмите «Рассчитать» для расчёта зарплат' : 'Попробуйте изменить параметры поиска'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIdx) => {
                    const isExpanded = expanded.has(row.specialistId);
                    const isStatusChanging = statusChanging.has(row.specialistId);
                    const showThresholdBadge = row.daysOverThreshold > 0 && row.bonusThresholdSessions !== null;
                    const totalWorking = row.workingDays;
                    // Estimate working days in period for attendance %
                    const periodDays = (() => {
                      try {
                        const msPerDay = 86_400_000;
                        const diff = Math.round((new Date(to).getTime() - new Date(from).getTime()) / msPerDay) + 1;
                        const weeks = Math.floor(diff / 7);
                        const rem   = diff % 7;
                        return weeks * 5 + Math.min(rem, 5);
                      } catch { return 22; }
                    })();
                    const attendancePct = periodDays > 0 ? (totalWorking / periodDays) * 100 : 0;
                    const absentDays    = Math.max(0, periodDays - totalWorking);

                    // Avatar color from name hash
                    const colors = ['bg-champagne/20 text-champagne', 'bg-sky-400/20 text-sky-400', 'bg-emerald-400/20 text-emerald-400', 'bg-violet-400/20 text-violet-400', 'bg-orange-400/20 text-orange-400'];
                    const colorCls = colors[row.name.charCodeAt(0) % colors.length] ?? colors[0];
                    const initials = row.name.split(' ').map((n) => n[0] ?? '').slice(0, 2).join('').toUpperCase();

                    return (
                      <React.Fragment key={row.specialistId}>
                        <tr
                          className={cn(
                            'border-b border-border-luxury/30 transition-colors cursor-pointer',
                            rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.012]',
                            'hover:bg-white/[0.025]',
                          )}
                          onClick={() => toggleExpand(row.specialistId)}
                        >
                          {/* Employee */}
                          <td className="px-4 py-3.5 border-r border-border-luxury/20">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${colorCls}`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/specialists/${row.specialistId}/activity?from=payroll`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm font-medium text-text-primary hover:text-champagne transition-colors leading-tight block truncate"
                                >
                                  {row.name}
                                </Link>
                                <RoleBadge role={row.role} />
                              </div>
                            </div>
                          </td>

                          {/* Attendance: Working days */}
                          <td className="px-3 py-3.5 text-center text-sm text-text-secondary tabular-nums">
                            {row.workingDays === 0 ? <span className="text-text-muted">—</span> : row.workingDays}
                          </td>
                          {/* Absent days */}
                          <td className="px-3 py-3.5 text-center text-sm tabular-nums">
                            {absentDays > 0
                              ? <span className="text-amber-400">{absentDays}</span>
                              : <span className="text-text-muted">—</span>}
                          </td>
                          {/* Attendance % */}
                          <td className="px-3 py-3.5 text-center border-r border-border-luxury/20">
                            {row.workingDays > 0
                              ? <AttendancePct pct={Math.min(100, attendancePct)} />
                              : <span className="text-text-muted text-xs">—</span>}
                          </td>

                          {/* Performance: Sessions */}
                          <td className="px-3 py-3.5 text-center tabular-nums">
                            {showThresholdBadge ? (
                              <div>
                                <span className="text-sm text-amber-400 font-medium">{row.completedSessions}</span>
                                <div className="text-[10px] text-amber-400/70 mt-0.5" title={`${row.daysOverThreshold} дней с ≥${row.bonusThresholdSessions ?? ''} сессиями`}>
                                  {row.daysOverThreshold} дн ≥{row.bonusThresholdSessions}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-text-secondary">{row.completedSessions}</span>
                            )}
                          </td>
                          {/* Sales volume */}
                          <td className="px-3 py-3.5 text-right text-sm text-text-muted tabular-nums border-r border-border-luxury/20">
                            {formatCurrency(row.salesVolume)}
                          </td>

                          {/* Earnings: Base */}
                          <td className="px-3 py-3.5 text-right tabular-nums">
                            {row.periodId === null
                              ? <span className="text-text-muted text-sm" title="Нажмите «Рассчитать»">—</span>
                              : <span className="text-sm text-text-secondary">{formatCurrency(row.baseSalary)}</span>}
                          </td>
                          {/* Commission */}
                          <td className="px-3 py-3.5 text-right tabular-nums">
                            {row.periodId === null
                              ? <span className="text-text-muted text-sm">—</span>
                              : <span className={cn('text-sm font-medium', row.totalCommission > 0 ? 'text-emerald-400' : 'text-text-muted')}>{formatCurrency(row.totalCommission)}</span>}
                          </td>
                          {/* Bonuses */}
                          <td className="px-3 py-3.5 text-right tabular-nums border-r border-border-luxury/20">
                            {row.totalBonus > 0
                              ? <span className="text-sm text-champagne">{formatCurrency(row.totalBonus)}</span>
                              : <span className="text-text-muted text-sm">—</span>}
                          </td>

                          {/* Deductions */}
                          <td className="px-3 py-3.5 text-right tabular-nums">
                            {row.totalDeduction > 0
                              ? <span className="text-sm text-red-400">{formatCurrency(row.totalDeduction)}</span>
                              : <span className="text-text-muted text-sm">—</span>}
                          </td>
                          {/* Adjustment */}
                          <td className="px-3 py-3.5 text-right tabular-nums border-r border-border-luxury/20">
                            {row.totalAdjustment !== 0
                              ? <span className={cn('text-sm', row.totalAdjustment > 0 ? 'text-emerald-400' : 'text-red-400')}>{row.totalAdjustment > 0 ? '+' : ''}{formatCurrency(row.totalAdjustment)}</span>
                              : <span className="text-text-muted text-sm">—</span>}
                          </td>

                          {/* Total payable */}
                          <td className="px-3 py-3.5 text-right tabular-nums">
                            {row.periodId === null
                              ? <span className="text-text-muted text-sm" title="Нажмите «Рассчитать»">—</span>
                              : <span className="text-base font-bold text-sky-400">{formatCurrency(row.totalPayable)}</span>}
                          </td>
                          {/* Status */}
                          <td className="px-3 py-3.5 text-center">
                            <StatusBadge status={row.status} />
                          </td>
                          {/* Expand toggle */}
                          <td className="px-3 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(row.specialistId); }}
                              className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded inline detail */}
                        {isExpanded && (
                          <tr className="border-b border-border-luxury/30">
                            <td colSpan={14} className="p-0">
                              <ExpandedRow
                                row={row}
                                isAdmin={isAdmin}
                                from={from}
                                to={to}
                                onAddBonus={() => setModal({ type: 'add-entry', specialistId: row.specialistId, specialistName: row.name, department: row.department, entryType: 'BONUS' })}
                                onAddDeduction={() => setModal({ type: 'add-entry', specialistId: row.specialistId, specialistName: row.name, department: row.department, entryType: 'DEDUCTION' })}
                                onConfigSalary={() => setModal({ type: 'salary-config', specialistId: row.specialistId, specialistName: row.name, department: row.department })}
                                onStatusChange={(status) => handleStatusChange(row.specialistId, status)}
                                statusChanging={isStatusChanging}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {/* Sticky totals footer */}
              {totals && filteredRows.length > 0 && !loading && (
                <tfoot>
                  <tr className="bg-obsidian/60 border-t-2 border-champagne/20">
                    <td className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide border-r border-border-luxury/20">
                      Итого ({filteredRows.length})
                    </td>
                    {/* Attendance: total working days */}
                    <td className="px-3 py-3 text-center text-sm font-semibold text-text-primary tabular-nums">
                      {filteredRows.reduce((s, r) => s + r.workingDays, 0)}
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 border-r border-border-luxury/20" />
                    {/* Performance: total sessions */}
                    <td className="px-3 py-3 text-center text-sm font-semibold text-text-primary tabular-nums">
                      {filteredRows.reduce((s, r) => s + r.completedSessions, 0)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-text-muted tabular-nums border-r border-border-luxury/20">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.salesVolume, 0))}
                    </td>
                    {/* Earnings */}
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text-secondary tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.baseSalary, 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-emerald-400 tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.totalCommission, 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-champagne tabular-nums border-r border-border-luxury/20">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.totalBonus, 0))}
                    </td>
                    {/* Deductions */}
                    <td className="px-3 py-3 text-right text-sm font-semibold text-red-400 tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.totalDeduction, 0))}
                    </td>
                    <td className="px-3 py-3 border-r border-border-luxury/20" />
                    {/* Grand total */}
                    <td className="px-3 py-3 text-right text-base font-bold text-sky-400 tabular-nums">
                      {formatCurrency(totals.totalPayrollCost)}
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                  </tr>
                </tfoot>
              )}

            </table>
          </div>
        </div>
      </>)}

      {/* ── TAB: Commissions ── */}
      {tab === 'commissions' && (
        <div className="space-y-3">
          {commLoading && <p className="text-sm text-text-tertiary py-4 text-center">Загрузка...</p>}
          {!commLoading && commEmployees.length === 0 && (
            <div className="rounded-2xl bg-charcoal/30 border border-border-luxury p-12 text-center">
              <Award className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-tertiary">Нет данных о комиссиях за выбранный период.</p>
              <p className="text-xs text-text-tertiary/60 mt-1">Комиссии появляются автоматически при записи продаж.</p>
            </div>
          )}
          {commEmployees.map((emp) => (
            <button
              key={emp.userId}
              type="button"
              onClick={() => setOpenPanel({ userId: emp.userId, name: emp.name, role: emp.role, department: emp.department })}
              className="w-full rounded-2xl bg-charcoal/30 border border-border-luxury p-5 text-left hover:bg-charcoal/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-champagne/15 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-champagne">
                      {emp.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{emp.name}</p>
                    <p className="text-xs text-text-tertiary">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Утверждено</p>
                    <p className="text-sm font-semibold text-champagne">{formatCurrency(emp.totalApproved)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Ожидает</p>
                    <p className={cn('text-sm font-medium', emp.pendingCount > 0 ? 'text-amber-400' : 'text-text-tertiary')}>{emp.pendingCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Процедур</p>
                    <p className="text-sm text-text-secondary">{emp.procedureCount}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
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

      {openPanel && (
        <EmployeePayrollPanel
          userId={openPanel.userId}
          name={openPanel.name}
          role={openPanel.role}
          department={openPanel.department}
          onClose={() => setOpenPanel(null)}
        />
      )}
    </div>
  );
}
