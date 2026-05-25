'use client';

import React from 'react';
import { Clock, TrendingUp, Users, Download, Loader2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BonusBucket { count: number; amount: number }

interface PayrollRow {
  specialistId:      string;
  name:              string;
  hoursWorked:       number;
  baseSalary:        number;
  bonuses: {
    firstTime: BonusBucket;
    existing:  BonusBucket;
    returning: BonusBucket;
  };
  totalBonus:        number;
  totalPay:          number;
  completedBookings: number;
  grossRevenue:      number;
}

interface PayrollTotals {
  hoursWorked:       number;
  baseSalary:        number;
  totalBonus:        number;
  totalPay:          number;
  completedBookings: number;
  grossRevenue:      number;
}

interface PayrollData {
  from:       string;
  to:         string;
  hourlyRate: number;
  rows:       PayrollRow[];
  totals:     PayrollTotals;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(d: Date): string { return d.toISOString().split('T')[0]; }
function firstOfMonth(): string {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
}
function today(): string { return toDateInput(new Date()); }

function downloadCsv(data: PayrollData, from: string, to: string) {
  const BOM = '﻿';
  const header = [
    'Специалист', 'Часов', 'База (₽)', 'Новые клиенты (кол-во)', 'Бонус новые',
    'Постоянные (кол-во)', 'Бонус постоянные', 'Вернувшиеся (кол-во)', 'Бонус вернувшиеся',
    'Итого бонус', 'Итого к выплате',
  ].join(';');
  const rows = data.rows.map((r) =>
    [
      r.name,
      r.hoursWorked,
      r.baseSalary.toFixed(2),
      r.bonuses.firstTime.count,
      r.bonuses.firstTime.amount.toFixed(2),
      r.bonuses.existing.count,
      r.bonuses.existing.amount.toFixed(2),
      r.bonuses.returning.count,
      r.bonuses.returning.amount.toFixed(2),
      r.totalBonus.toFixed(2),
      r.totalPay.toFixed(2),
    ].join(';'),
  );
  const totals = [
    'ИТОГО', data.totals.hoursWorked, data.totals.baseSalary.toFixed(2),
    '', '', '', '', '', '',
    data.totals.totalBonus.toFixed(2), data.totals.totalPay.toFixed(2),
  ].join(';');
  const csv  = BOM + [header, ...rows, totals].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `payroll_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Bonus row sub-component ──────────────────────────────────────────────────

function BonusBreakdown({ bonuses }: { bonuses: PayrollRow['bonuses'] }) {
  const items = [
    { label: 'Новые клиенты',          rate: '2%',  ...bonuses.firstTime, color: 'text-emerald-400' },
    { label: 'Постоянные (есть записи)', rate: '3%', ...bonuses.existing,  color: 'text-sky-400'     },
    { label: 'Прошли все процедуры',   rate: '4%',  ...bonuses.returning, color: 'text-violet-400'  },
  ];
  return (
    <div className="flex flex-wrap gap-4 py-2">
      {items.map(({ label, rate, count, amount, color }) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="text-text-muted">{label}</span>
          <span className={cn('font-medium tabular-nums', color)}>
            {count > 0 ? `×${count} = ${formatCurrency(amount)}` : '—'}
          </span>
          <span className="text-text-muted/60 text-[10px]">{rate}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Hours input ──────────────────────────────────────────────────────────────

function HoursInput({
  value,
  onSave,
  disabled,
}: {
  value: number;
  onSave: (h: number) => void;
  disabled: boolean;
}) {
  const [local, setLocal] = React.useState(String(value));

  React.useEffect(() => { setLocal(String(value)); }, [value]);

  function commit() {
    const parsed = parseFloat(local);
    if (!isNaN(parsed) && parsed >= 0) onSave(parsed);
    else setLocal(String(value));
  }

  return (
    <input
      type="number"
      min="0"
      step="0.5"
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      className={cn(
        'w-20 rounded-lg border border-border-luxury bg-obsidian px-2 py-1 text-sm text-right text-text-primary tabular-nums',
        'focus:outline-none focus:ring-1 focus:ring-champagne/40',
        'disabled:opacity-50',
      )}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [from,      setFrom]      = React.useState(firstOfMonth());
  const [to,        setTo]        = React.useState(today());
  const [data,      setData]      = React.useState<PayrollData | null>(null);
  const [loading,   setLoading]   = React.useState(false);
  const [error,     setError]     = React.useState('');
  const [expanded,  setExpanded]  = React.useState<Set<string>>(new Set());
  const [saving,    setSaving]    = React.useState<Set<string>>(new Set());

  async function load() {
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`/api/v1/payroll?from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.error?.message ?? 'Ошибка загрузки'); return; }
      setData(json.data as PayrollData);
    } catch { setError('Ошибка сети'); }
    finally   { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveHours(specialistId: string, hoursWorked: number) {
    if (!data) return;
    setSaving((s) => new Set(s).add(specialistId));
    try {
      await fetch('/api/v1/payroll/hours', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ specialistId, periodFrom: from, periodTo: to, hoursWorked }),
      });
      // Optimistically update local state
      setData((prev) => {
        if (!prev) return prev;
        const rows = prev.rows.map((r) => {
          if (r.specialistId !== specialistId) return r;
          const baseSalary = Math.round(hoursWorked * (data?.hourlyRate ?? 0) * 100) / 100;
          return { ...r, hoursWorked, baseSalary, totalPay: Math.round((baseSalary + r.totalBonus) * 100) / 100 };
        });
        const totals = rows.reduce(
          (acc, r) => ({
            hoursWorked:       acc.hoursWorked + r.hoursWorked,
            baseSalary:        Math.round((acc.baseSalary + r.baseSalary) * 100) / 100,
            totalBonus:        Math.round((acc.totalBonus + r.totalBonus) * 100) / 100,
            totalPay:          Math.round((acc.totalPay + r.totalPay) * 100) / 100,
            completedBookings: acc.completedBookings + r.completedBookings,
            grossRevenue:      Math.round((acc.grossRevenue + r.grossRevenue) * 100) / 100,
          }),
          { hoursWorked: 0, baseSalary: 0, totalBonus: 0, totalPay: 0, completedBookings: 0, grossRevenue: 0 },
        );
        return { ...prev, rows, totals };
      });
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(specialistId); return n; });
    }
  }

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Зарплатная ведомость</h1>
            <p className="text-sm text-text-muted mt-0.5">
              Комиссии и выплаты по сотрудникам
            </p>
          </div>
          {data && (
            <button
              type="button"
              onClick={() => downloadCsv(data, from, to)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:border-border-light transition-all"
            >
              <Download className="w-4 h-4" />
              Скачать CSV
            </button>
          )}
        </div>

        {/* Period picker */}
        <div className="flex flex-wrap items-end gap-3 bg-charcoal border border-border-luxury rounded-2xl px-5 py-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted">С</label>
            <input
              type="date" value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted">По</label>
            <input
              type="date" value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          <div className="flex gap-1.5">
            {[
              { label: 'Этот месяц',    from: firstOfMonth(), to: today() },
              {
                label: 'Прошлый месяц',
                from: toDateInput(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)),
                to:   toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 0)),
              },
              {
                label: '3 месяца',
                from: toDateInput(new Date(new Date().setMonth(new Date().getMonth() - 3))),
                to:   today(),
              },
            ].map((p) => (
              <button
                key={p.label} type="button"
                onClick={() => { setFrom(p.from); setTo(p.to); }}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                  from === p.from && to === p.to
                    ? 'border-champagne/50 bg-champagne/10 text-champagne'
                    : 'border-border-luxury text-text-muted hover:text-text-secondary',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button" onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne text-obsidian text-sm font-medium hover:bg-champagne/90 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Рассчитать
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
        )}

        {/* KPI strip */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'База (зарплата)',  value: formatCurrency(data.totals.baseSalary),  icon: Clock,       color: 'text-champagne'       },
              { label: 'Бонусы',           value: formatCurrency(data.totals.totalBonus),  icon: TrendingUp,  color: 'text-emerald-400'     },
              { label: 'Итого к выплате',  value: formatCurrency(data.totals.totalPay),    icon: DollarSign,  color: 'text-sky-400'         },
              { label: 'Завершённых записей', value: String(data.totals.completedBookings), icon: Users,      color: 'text-text-secondary'  },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-charcoal border border-border-luxury rounded-2xl px-5 py-4 space-y-2">
                <Icon className={cn('w-5 h-5', color)} />
                <p className="text-xl font-semibold text-text-primary tabular-nums">{value}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {data && (
          <div className="bg-charcoal border border-border-luxury rounded-2xl overflow-hidden">
            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border-luxury/60 text-xs font-medium text-text-muted uppercase tracking-wider">
              <span>Специалист</span>
              <span className="text-right">Часов</span>
              <span className="text-right">База</span>
              <span className="text-right">Бонусы</span>
              <span className="text-right">Итого</span>
              <span className="text-right">Записей</span>
              <span className="w-6" />
            </div>

            {data.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <DollarSign className="w-8 h-8 text-text-muted mb-3" />
                <p className="text-sm text-text-primary font-medium">Нет данных за период</p>
                <p className="text-xs text-text-muted mt-1">Нет активных специалистов или завершённых записей</p>
              </div>
            ) : (
              <div className="divide-y divide-border-luxury/40">
                {data.rows.map((row) => {
                  const isExpanded = expanded.has(row.specialistId);
                  const isSaving   = saving.has(row.specialistId);
                  return (
                    <div key={row.specialistId}>
                      {/* Main row */}
                      <div className="grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                        {/* Name */}
                        <div>
                          <p className="text-sm font-medium text-text-primary">{row.name}</p>
                          <p className="text-xs text-text-muted mt-0.5 lg:hidden">
                            {row.completedBookings} записей
                          </p>
                        </div>

                        {/* Hours input */}
                        <div className="flex justify-end items-center gap-1.5">
                          <HoursInput
                            value={row.hoursWorked}
                            onSave={(h) => saveHours(row.specialistId, h)}
                            disabled={isSaving}
                          />
                          {isSaving && <Loader2 className="w-3 h-3 animate-spin text-text-muted shrink-0" />}
                        </div>

                        {/* Base salary */}
                        <p className="hidden lg:block text-right text-sm text-champagne tabular-nums">
                          {formatCurrency(row.baseSalary)}
                        </p>

                        {/* Total bonus */}
                        <p className="hidden lg:block text-right text-sm text-emerald-400 tabular-nums">
                          {row.totalBonus > 0 ? formatCurrency(row.totalBonus) : <span className="text-text-muted">—</span>}
                        </p>

                        {/* Total pay */}
                        <p className="hidden lg:block text-right text-sm font-semibold text-sky-400 tabular-nums">
                          {formatCurrency(row.totalPay)}
                        </p>

                        {/* Booking count */}
                        <p className="hidden lg:block text-right text-sm text-text-secondary tabular-nums">
                          {row.completedBookings}
                        </p>

                        {/* Expand toggle */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.specialistId)}
                          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
                          aria-label={isExpanded ? 'Свернуть' : 'Развернуть бонусы'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Bonus breakdown (desktop, expanded) */}
                      {isExpanded && (
                        <div className="hidden lg:block px-5 pb-4 -mt-2 border-t border-border-luxury/30 pt-3 bg-obsidian/20">
                          <BonusBreakdown bonuses={row.bonuses} />
                        </div>
                      )}

                      {/* Mobile summary */}
                      <div className="lg:hidden px-5 pb-4 -mt-1 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">База:</span>
                          <span className="text-champagne tabular-nums">{formatCurrency(row.baseSalary)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">Бонусы:</span>
                          <span className="text-emerald-400 tabular-nums">
                            {row.totalBonus > 0 ? formatCurrency(row.totalBonus) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-text-muted">Итого:</span>
                          <span className="text-sky-400 tabular-nums">{formatCurrency(row.totalPay)}</span>
                        </div>
                        <BonusBreakdown bonuses={row.bonuses} />
                      </div>
                    </div>
                  );
                })}

                {/* Totals row */}
                <div className="grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-t border-border-luxury bg-obsidian/30 items-center">
                  <p className="text-sm font-semibold text-text-primary">Итого</p>
                  <p className="text-right text-sm font-semibold text-text-primary tabular-nums">{data.totals.hoursWorked} ч</p>
                  <p className="hidden lg:block text-right text-sm font-semibold text-champagne tabular-nums">{formatCurrency(data.totals.baseSalary)}</p>
                  <p className="hidden lg:block text-right text-sm font-semibold text-emerald-400 tabular-nums">{formatCurrency(data.totals.totalBonus)}</p>
                  <p className="hidden lg:block text-right text-sm font-bold text-sky-400 tabular-nums">{formatCurrency(data.totals.totalPay)}</p>
                  <p className="hidden lg:block text-right text-sm font-semibold text-text-primary tabular-nums">{data.totals.completedBookings}</p>
                  <div className="hidden lg:block w-6" />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
