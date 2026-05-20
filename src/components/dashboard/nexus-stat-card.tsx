import * as React from 'react';
import { SparklineChart } from './sparkline-chart';

interface TrendInfo {
  value: number;
  positive: boolean;
  label: string;
}

interface NexusStatCardProps {
  title: string;
  'data-i18n'?: string;
  value: string | number;
  trend: TrendInfo;
  iconBg: string;
  icon: React.ReactNode;
  sparkData: number[];
  sparkColor: string;
  gradientId: string;
  detailsHref?: string;
}

export function NexusStatCard({
  title,
  'data-i18n': i18nKey,
  value,
  trend,
  iconBg,
  icon,
  sparkData,
  sparkColor,
  gradientId,
  detailsHref = '#',
}: NexusStatCardProps) {
  return (
    <div className="bg-white border border-[#e8eaf0] rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7a99]"
          data-i18n={i18nKey}
        >
          {title}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      <div className="text-[30px] font-bold text-[#1a2035] leading-none mb-2">{value}</div>

      <div
        className={`flex items-center gap-1 text-[12px] font-semibold mb-3 ${
          trend.positive ? 'text-[#22c55e]' : 'text-[#ef4444]'
        }`}
      >
        {trend.positive ? (
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        ) : (
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="18 9 12 15 6 9" />
          </svg>
        )}
        {trend.positive ? '+' : ''}{trend.value}%{' '}
        <span className="text-[#6b7a99] font-normal">{trend.label}</span>
      </div>

      <SparklineChart data={sparkData} color={sparkColor} gradientId={gradientId} />

      <a
        href={detailsHref}
        className="flex items-center gap-1 text-[11.5px] font-semibold text-[#7C5CFC] hover:text-[#5b3ee0] transition-colors pt-2.5 border-t border-[#e8eaf0] mt-auto"
        data-i18n="stat.details"
      >
        Подробнее
        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </a>
    </div>
  );
}
