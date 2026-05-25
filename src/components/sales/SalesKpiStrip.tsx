'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { SalesSummaryResponse, KpiMetric } from '@/modules/sales/domain/sales.dto';

interface SalesKpiStripProps {
  data:      SalesSummaryResponse | null;
  loading:   boolean;
  className?: string;
}

const KPI_META: {
  key:    keyof Omit<SalesSummaryResponse, 'periodLabel'>;
  label:  string;
  format: (n: number) => string;
}[] = [
  { key: 'revenue',           label: 'Выручка',         format: (n) => `₽${n.toLocaleString('ru-RU')}` },
  { key: 'bookings',          label: 'Записей',          format: (n) => n.toLocaleString('ru-RU') },
  { key: 'avgTicket',         label: 'Средний чек',      format: (n) => `₽${n.toLocaleString('ru-RU')}` },
  { key: 'uniqueClients',     label: 'Уникальных клиентов', format: (n) => n.toLocaleString('ru-RU') },
  { key: 'cancellationRate',  label: 'Отмены',           format: (n) => `${(n * 100).toFixed(1)}%` },
];

function Delta({ metric }: { metric: KpiMetric }) {
  if (metric.deltaPercent === null) return null;
  const pct    = metric.deltaPercent;
  const isGood = pct >= 0;
  return (
    <span className={cn('flex items-center gap-0.5 text-xs font-medium', isGood ? 'text-emerald-400' : 'text-red-400')}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={isGood ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  label,
  metric,
  format,
  loading,
}: {
  label:   string;
  metric:  KpiMetric | undefined;
  format:  (n: number) => string;
  loading: boolean;
}) {
  if (loading || !metric) {
    return (
      <div className="flex-1 min-w-[140px] bg-charcoal border border-border-luxury rounded-xl p-4 animate-pulse">
        <div className="h-3 w-24 bg-border-luxury rounded mb-3" />
        <div className="h-6 w-32 bg-border-luxury rounded mb-2" />
        <div className="h-3 w-16 bg-border-luxury rounded" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[140px] bg-charcoal border border-border-luxury rounded-xl p-4 hover:border-border-light transition-colors">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-semibold text-text-primary mb-1">
        {format(metric.current)}
      </p>
      <div className="flex items-center gap-1.5">
        <Delta metric={metric} />
        {metric.previous > 0 && (
          <span className="text-xs text-text-muted">
            {format(metric.previous)} пред.
          </span>
        )}
      </div>
    </div>
  );
}

export function SalesKpiStrip({ data, loading, className }: SalesKpiStripProps) {
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {KPI_META.map((meta) => (
        <KpiCard
          key={meta.key}
          label={meta.label}
          metric={data ? (data[meta.key] as KpiMetric) : undefined}
          format={meta.format}
          loading={loading}
        />
      ))}
    </div>
  );
}
