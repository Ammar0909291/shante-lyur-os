import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    positive: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, trend, icon, className, loading = false }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-onyx border border-border-luxury rounded-2xl p-6',
        'transition-all duration-200 hover:border-border-light hover:shadow-luxury',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">
            {title}
          </p>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-28 bg-charcoal rounded-md animate-shimmer" />
              <div className="h-3 w-20 bg-charcoal rounded animate-shimmer" />
            </div>
          ) : (
            <>
              <p className="font-serif text-3xl font-medium text-text-primary leading-none tracking-tight">
                {value}
              </p>
              {subtitle && (
                <p className="text-sm text-text-secondary mt-1.5">{subtitle}</p>
              )}
            </>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'shrink-0 w-11 h-11 rounded-xl',
              'flex items-center justify-center',
              'bg-champagne/8 text-champagne',
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && !loading && (
        <div className="mt-4 pt-4 border-t border-border-luxury flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold',
              trend.positive ? 'text-sage' : 'text-red-400',
            )}
          >
            {trend.positive ? (
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-text-tertiary">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}

export { StatCard };
