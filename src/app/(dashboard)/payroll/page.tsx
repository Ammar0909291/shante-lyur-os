'use client';

import React from 'react';
import { DollarSign, TrendingUp, Users, Download, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollRow {
  specialistId:      string;
  name:              string;
  commissionRate:    number;
  completedBookings: number;
  grossRevenue:      number;
  commissionEarned:  number;
  studioRevenue:     number;
}

interface PayrollTotals {
  completedBookings: number;
  grossRevenue:      number;
  commissionEarned:  number;
  studioRevenue:     number;
}

interface PayrollData {
  from:   string;
  to:     string;
  rows:   PayrollRow[];
  totals: PayrollTotals;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(d: Date): string {
  return d.toISOString().split('T')[0];
}

function firstOfMonth(): string {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
}

function today(): string {
  return toDateInput(new Date());
}

function downloadCsv(data: PayrollData, from: string, to: string) {
  const BOM = '﻿';
  const header = ['Специалист', 'Ставка %', 'Записей', 'Выручка', 'Комиссия', 'Доход студии'].join(';');
  const rows = data.rows.map((r) =>
    [
      r.name,
      `${Math.round(r.commissionRate * 100)}%`,
      r.completedBookings,
      r.grossRevenue.toFixed(2),
      r.commissionEarned.toFixed(2),
      r.studioRevenue.toFixed(2),
    ].join(';'),
  );
  const totals = [
    'ИТОГО',
    '',
    data.totals.completedBookings,
    data.totals.grossRevenue.toFixed(2),
    data.totals.commissionEarned.toFixed(2),
    data.totals.studioRevenue.toFixed(2),
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [from,    setFrom]    = React.useState(firstOfMonth());
  const [to,      setTo]      = React.useState(today());
  const [data,    setData]    = React.useState<PayrollData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState('');

  async function load() {
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`/api/v1/payroll?from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.error?.message ?? 'Ошибка загрузки'); return; }
      setData(json.data as PayrollData);
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }

  // Auto-load on mount
  React.useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Зарплатная ведомость</h1>
            <p className="text-sm text-text-muted mt-0.5">Комиссии и выручка по специалистам</p>
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
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted">По</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/40"
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5">
            {[
              { label: 'Этот месяц', from: firstOfMonth(), to: today() },
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
                key={p.label}
                type="button"
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
            type="button"
            onClick={load}
            disabled={loading}
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
              { label: 'Всего выручки',    value: formatCurrency(data.totals.grossRevenue),     icon: TrendingUp,  color: 'text-champagne' },
              { label: 'К выплате (комиссии)', value: formatCurrency(data.totals.commissionEarned), icon: DollarSign, color: 'text-emerald-400' },
              { label: 'Доход студии',      value: formatCurrency(data.totals.studioRevenue),   icon: TrendingUp,  color: 'text-blue-400' },
              { label: 'Завершённых записей', value: data.totals.completedBookings.toString(),  icon: Users,       color: 'text-text-secondary' },
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
            {/* Header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-border-luxury/60 text-xs font-medium text-text-muted uppercase tracking-wider">
              <span>Специалист</span>
              <span className="text-right">Ставка</span>
              <span className="text-right">Записей</span>
              <span className="text-right">Выручка</span>
              <span className="text-right">Комиссия</span>
              <span className="text-right">Студии</span>
            </div>

            {data.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <DollarSign className="w-8 h-8 text-text-muted mb-3" />
                <p className="text-sm text-text-primary font-medium">Нет данных за период</p>
                <p className="text-xs text-text-muted mt-1">Нет завершённых записей в выбранном диапазоне</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border-luxury/40">
                  {data.rows.map((row) => (
                    <div
                      key={row.specialistId}
                      className={cn(
                        'grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors',
                        row.completedBookings === 0 && 'opacity-50',
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{row.name}</p>
                        <p className="text-xs text-text-muted mt-0.5 md:hidden">
                          {row.completedBookings} записей · {Math.round(row.commissionRate * 100)}%
                        </p>
                      </div>
                      <div className="hidden md:block text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-champagne/10 text-champagne border border-champagne/20">
                          {Math.round(row.commissionRate * 100)}%
                        </span>
                      </div>
                      <p className="hidden md:block text-right text-sm text-text-secondary tabular-nums">{row.completedBookings}</p>
                      <p className="hidden md:block text-right text-sm text-text-primary tabular-nums">{formatCurrency(row.grossRevenue)}</p>
                      <p className="hidden md:block text-right text-sm font-semibold text-emerald-400 tabular-nums">{formatCurrency(row.commissionEarned)}</p>
                      <p className="hidden md:block text-right text-sm text-blue-400 tabular-nums">{formatCurrency(row.studioRevenue)}</p>

                      {/* Mobile summary row */}
                      <div className="md:hidden col-span-full flex justify-between text-sm">
                        <span className="text-text-muted">Выручка: <span className="text-text-primary">{formatCurrency(row.grossRevenue)}</span></span>
                        <span className="text-text-muted">К выплате: <span className="text-emerald-400 font-medium">{formatCurrency(row.commissionEarned)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals row */}
                <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-t border-border-luxury bg-obsidian/30">
                  <p className="text-sm font-semibold text-text-primary">Итого</p>
                  <div className="hidden md:block" />
                  <p className="hidden md:block text-right text-sm font-semibold text-text-primary tabular-nums">{data.totals.completedBookings}</p>
                  <p className="hidden md:block text-right text-sm font-semibold text-text-primary tabular-nums">{formatCurrency(data.totals.grossRevenue)}</p>
                  <p className="hidden md:block text-right text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(data.totals.commissionEarned)}</p>
                  <p className="hidden md:block text-right text-sm font-bold text-blue-400 tabular-nums">{formatCurrency(data.totals.studioRevenue)}</p>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
