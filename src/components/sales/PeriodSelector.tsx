'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type PeriodPreset = '7d' | '30d' | '90d' | '365d' | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to:   string; // YYYY-MM-DD
}

interface PeriodSelectorProps {
  value:    DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESETS: { label: string; value: PeriodPreset; days: number }[] = [
  { label: '7д',   value: '7d',   days: 7   },
  { label: '30д',  value: '30d',  days: 30  },
  { label: '90д',  value: '90d',  days: 90  },
  { label: '1год', value: '365d', days: 365 },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function detectPreset(range: DateRange): PeriodPreset {
  const diff = Math.round(
    (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000,
  );
  const match = PRESETS.find((p) => p.days === diff + 1 || p.days === diff);
  return match?.value ?? 'custom';
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  const activePreset = detectPreset(value);

  function applyPreset(days: number) {
    const to   = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    onChange({ from: toDateStr(from), to: toDateStr(to) });
    setShowCustom(false);
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => applyPreset(p.days)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            activePreset === p.value && !showCustom
              ? 'bg-champagne text-obsidian shadow-champagne-sm'
              : 'bg-charcoal text-text-secondary border border-border-luxury hover:border-border-light hover:text-text-primary',
          )}
        >
          {p.label}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setShowCustom((v) => !v)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          showCustom
            ? 'bg-champagne text-obsidian shadow-champagne-sm'
            : 'bg-charcoal text-text-secondary border border-border-luxury hover:border-border-light hover:text-text-primary',
        )}
      >
        Период
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 ml-1">
          <input
            type="date"
            value={value.from}
            max={value.to}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="bg-charcoal border border-border-luxury rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-champagne/60"
          />
          <span className="text-text-muted text-sm">—</span>
          <input
            type="date"
            value={value.to}
            min={value.from}
            max={toDateStr(new Date())}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="bg-charcoal border border-border-luxury rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-champagne/60"
          />
        </div>
      )}
    </div>
  );
}
