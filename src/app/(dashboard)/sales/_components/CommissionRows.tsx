'use client';

import * as React from 'react';
import { Percent } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export type CommissionCategory =
  | 'STANDARD_SALE'
  | 'NEW_CLIENT'
  | 'RETURNING_CLIENT'
  | 'UPSELL'
  | 'REFERRAL'
  | 'TARGET_BONUS'
  | 'QUALITY_BONUS'
  | 'CUSTOM';

export interface CommissionRowData {
  specialistId: string;
  userId: string;
  name: string;
  commissionCategory: CommissionCategory;
  percentage: number;
  amount: number;
}

interface Props {
  rows: CommissionRowData[];
  saleTotal: number;
  onChange: (rows: CommissionRowData[]) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<CommissionCategory, string> = {
  STANDARD_SALE:    'Стандартная комиссия',
  NEW_CLIENT:       'Новый клиент',
  RETURNING_CLIENT: 'Возврат клиента',
  UPSELL:           'Допродажа',
  REFERRAL:         'Реферал',
  TARGET_BONUS:     'Бонус за план',
  QUALITY_BONUS:    'Бонус за качество',
  CUSTOM:           'Особый бонус',
};

function floorKopek(pct: number, total: number): number {
  return Math.floor((pct / 100) * total * 100) / 100;
}

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

export function CommissionRows({ rows, saleTotal, onChange, disabled }: Props) {
  function updateRow(idx: number, patch: Partial<CommissionRowData>) {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, ...patch };
      if (patch.percentage !== undefined) {
        updated.amount = floorKopek(updated.percentage, saleTotal);
      }
      return updated;
    });
    onChange(next);
  }

  function updateCategory(idx: number, cat: CommissionCategory) {
    updateRow(idx, { commissionCategory: cat });
  }

  function updatePct(idx: number, raw: string) {
    const pct = Math.min(100, Math.max(0, parseFloat(raw) || 0));
    updateRow(idx, { percentage: pct, amount: floorKopek(pct, saleTotal) });
  }

  const totalPct = rows.reduce((s, r) => s + r.percentage, 0);
  const totalAmt = rows.reduce((s, r) => s + r.amount, 0);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-luxury bg-charcoal/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-luxury/60">
        <Percent className="w-3.5 h-3.5 text-champagne shrink-0" />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Распределение комиссии</span>
        <span className="ml-auto text-xs text-text-tertiary tabular-nums">
          Сумма: <span className="text-text-secondary">{fmt(saleTotal)} ₽</span>
        </span>
      </div>

      {saleTotal === 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-400">
          Сумма продажи ₽0 — комиссия будет ₽0
        </div>
      )}

      <div className="divide-y divide-border-luxury/40">
        {rows.map((row, idx) => (
          <div key={row.specialistId} className="px-4 py-3 space-y-2">
            {/* Specialist header */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-champagne/15 border border-champagne/30 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-semibold text-champagne">
                  {row.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-medium text-text-primary flex-1 truncate">{row.name}</p>
            </div>

            {/* Commission type + percentage */}
            <div className="flex items-center gap-2 pl-9">
              <select
                value={row.commissionCategory}
                onChange={(e) => updateCategory(idx, e.target.value as CommissionCategory)}
                disabled={disabled}
                className="flex-1 px-2 py-1.5 rounded-lg bg-onyx border border-border-luxury text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-champagne/30 [&>option]:bg-obsidian disabled:opacity-50"
              >
                {(Object.entries(CATEGORY_LABELS) as [CommissionCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <div className="relative w-20 shrink-0">
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={row.percentage}
                  onChange={(e) => updatePct(idx, e.target.value)}
                  onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                  disabled={disabled}
                  className="w-full px-2 py-1.5 pr-5 rounded-lg bg-onyx border border-border-luxury text-text-primary text-xs text-right focus:outline-none focus:ring-1 focus:ring-champagne/30 disabled:opacity-50"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">%</span>
              </div>

              <span className="text-xs text-text-muted">=</span>
              <span className="text-xs font-medium text-text-secondary tabular-nums w-20 text-right shrink-0">{fmt(row.amount)} ₽</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer totals */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-t text-xs tabular-nums ${
        totalPct > 100  ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
        : totalPct === 100 ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
        : 'border-border-luxury/60 text-text-muted'
      }`}>
        <span>
          {totalPct > 100 && '⚠ '}{totalPct === 100 && '✓ '}
          Итого: <span className="font-medium">{totalPct.toFixed(1)}%</span>
        </span>
        <span className="font-medium">{fmt(totalAmt)} ₽</span>
      </div>
    </div>
  );
}
