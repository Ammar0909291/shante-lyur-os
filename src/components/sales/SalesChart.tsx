'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { SalesChartResponse, SalesChartSeries } from '@/modules/sales/domain/sales.dto';

type ChartMode = 'line' | 'bar';

interface SalesChartProps {
  data:      SalesChartResponse | null;
  loading:   boolean;
  className?: string;
}

function formatLabel(label: string, bucketBy: SalesChartResponse['bucketBy']): string {
  try {
    const d = new Date(label);
    if (bucketBy === 'hour') {
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    if (bucketBy === 'month') {
      return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return label;
  }
}

function buildChartData(series: SalesChartSeries[]) {
  if (!series.length) return [];
  const base = series[0].data.map((pt) => ({ label: pt.label, timestamp: pt.timestamp }));
  const result = base.map((row, i) => {
    const out: Record<string, unknown> = { label: row.label, timestamp: row.timestamp };
    for (const s of series) {
      out[`${s.key}_revenue`]   = s.data[i]?.revenue   ?? 0;
      out[`${s.key}_bookings`]  = s.data[i]?.bookings  ?? 0;
    }
    return out;
  });
  return result;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  bucketBy,
  currency,
}: {
  active?:   boolean;
  payload?:  { color: string; name: string; value: number }[];
  label?:    string;
  bucketBy:  SalesChartResponse['bucketBy'];
  currency:  string;
}) => {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-charcoal border border-border-luxury rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-text-muted mb-1.5">{formatLabel(label, bucketBy)}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="text-text-primary font-medium">
            {p.name.includes('Записей')
              ? p.value.toLocaleString('ru-RU')
              : `${currency}${p.value.toLocaleString('ru-RU')}`}
          </span>
        </div>
      ))}
    </div>
  );
};

export function SalesChart({ data, loading, className }: SalesChartProps) {
  const [mode, setMode] = React.useState<ChartMode>('line');

  if (loading) {
    return (
      <div className={cn('bg-charcoal border border-border-luxury rounded-2xl p-6', className)}>
        <div className="h-4 w-32 bg-border-luxury rounded animate-pulse mb-4" />
        <div className="h-64 bg-border-luxury/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || !data.series.length) {
    return (
      <div className={cn('bg-charcoal border border-border-luxury rounded-2xl p-6 flex items-center justify-center h-80', className)}>
        <p className="text-text-muted text-sm">Нет данных за выбранный период</p>
      </div>
    );
  }

  const chartData = buildChartData(data.series);
  const isMulti   = data.series.length > 1;

  return (
    <div className={cn('bg-charcoal border border-border-luxury rounded-2xl p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-primary">Динамика продаж</h3>
        <div className="flex gap-1">
          {(['line', 'bar'] as ChartMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                mode === m
                  ? 'bg-champagne/20 text-champagne'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {m === 'line' ? 'Линия' : 'Столбцы'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis
            dataKey="label"
            tickFormatter={(v) => formatLabel(v as string, data.bucketBy)}
            tick={{ fill: '#888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            tickFormatter={(v: number) => `₽${(v / 1000).toFixed(0)}k`}
            tick={{ fill: '#888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          {isMulti && (
            <YAxis
              yAxisId="bookings"
              orientation="right"
              tick={{ fill: '#888', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
          )}
          <Tooltip
            content={
              <CustomTooltip
                bucketBy={data.bucketBy}
                currency={data.currency === 'RUB' ? '₽' : data.currency}
              />
            }
          />
          {data.series.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#888' }}
            />
          )}
          {data.series.map((s) =>
            mode === 'line' ? (
              <Line
                key={s.key}
                yAxisId="revenue"
                type="monotone"
                dataKey={`${s.key}_revenue`}
                name={`${s.name} — выручка`}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ) : (
              <Bar
                key={s.key}
                yAxisId="revenue"
                dataKey={`${s.key}_revenue`}
                name={`${s.name} — выручка`}
                fill={s.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
