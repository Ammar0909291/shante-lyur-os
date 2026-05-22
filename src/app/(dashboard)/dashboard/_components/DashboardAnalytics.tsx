'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import type { DashboardSummary } from '@/types/analytics';

interface Props {
  summary: DashboardSummary;
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function TrendPill({ value, label }: { value: number; label?: string }) {
  if (value > 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-sage">
        <TrendingUp className="w-3 h-3" aria-hidden="true" />
        +{value}%{label ? <span className="font-normal text-text-tertiary">&nbsp;{label}</span> : null}
      </span>
    );
  }
  if (value < -2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
        <TrendingDown className="w-3 h-3" aria-hidden="true" />
        {value}%{label ? <span className="font-normal text-text-tertiary">&nbsp;{label}</span> : null}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary">
      <Minus className="w-3 h-3" aria-hidden="true" />
      {value}%{label ? <>&nbsp;{label}</> : null}
    </span>
  );
}

function TypeChip({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  variant?: 'gold' | 'sage' | 'default';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variant === 'gold' && 'bg-champagne/10 text-champagne',
        variant === 'sage' && 'bg-sage/10 text-sage',
        variant === 'default' && 'bg-charcoal text-text-secondary',
      )}
    >
      {value} {label}
    </span>
  );
}

function KPICard({
  children,
  href,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const base = cn(
    'bg-onyx border border-border-luxury rounded-2xl p-5',
    'transition-all duration-200',
    href && 'hover:border-champagne/30 hover:shadow-champagne-sm hover:scale-[1.005]',
    className,
  );
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }
  return <div className={base}>{children}</div>;
}

function CardHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        {title}
      </p>
      <div className="shrink-0 w-9 h-9 rounded-xl bg-champagne/8 text-champagne flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DashboardAnalytics({ summary }: Props) {
  const { t } = useLanguage();
  const { bookings, specialists, revenue } = summary;

  function fmtCurrency(n: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

  return (
    <div className="space-y-4">
      {/* ── Row 1: Three KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Bookings today */}
        <KPICard href="/bookings">
          <CardHeader title={t('dashboard.bookings.total')} icon={<Calendar className="w-4 h-4" />} />
          <p className="font-serif text-3xl font-medium text-text-primary mt-2 leading-none">
            {bookings.today.total}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <TypeChip
              label={t('dashboard.bookings.cosmetology')}
              value={bookings.today.byType.cosmetology}
              variant="gold"
            />
            <TypeChip
              label={t('dashboard.bookings.massage')}
              value={bookings.today.byType.massage}
              variant="sage"
            />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-luxury">
            <span className="text-xs text-text-secondary">
              {bookings.today.completed}&nbsp;{t('dashboard.bookings.completed')}
              &nbsp;·&nbsp;
              {bookings.today.upcoming}&nbsp;{t('dashboard.bookings.upcoming')}
            </span>
            <TrendPill
              value={bookings.trend.vsYesterday}
              label={t('dashboard.trend.vsYesterday')}
            />
          </div>
        </KPICard>

        {/* Revenue */}
        <KPICard href="/analytics">
          <CardHeader title={t('dashboard.revenue.today')} icon={<TrendingUp className="w-4 h-4" />} />
          <p className="font-serif text-3xl font-medium text-text-primary mt-2 leading-none tabular-nums">
            {fmtCurrency(revenue.today)}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <TypeChip
              label={t('dashboard.bookings.cosmetology')}
              value={fmtCurrency(revenue.thisWeek.byType.cosmetology)}
              variant="gold"
            />
            <TypeChip
              label={t('dashboard.bookings.massage')}
              value={fmtCurrency(revenue.thisWeek.byType.massage)}
              variant="sage"
            />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-luxury">
            <span className="text-xs text-text-secondary">
              {t('dashboard.revenue.week')}: {fmtCurrency(revenue.thisWeek.total)}
            </span>
            <TrendPill
              value={revenue.trend.vsLastWeek}
              label={t('dashboard.trend.vsLastWeek')}
            />
          </div>
        </KPICard>

        {/* Specialists */}
        <KPICard href="/specialists">
          <CardHeader title={t('dashboard.specialists.working')} icon={<Users className="w-4 h-4" />} />
          <p className="font-serif text-3xl font-medium text-text-primary mt-2 leading-none">
            {specialists.workingToday}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {t('dashboard.specialists.ofTotal').replace('{n}', String(specialists.active))}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <TypeChip
              label={t('dashboard.bookings.cosmetology')}
              value={specialists.byType.cosmetology}
              variant="gold"
            />
            <TypeChip
              label={t('dashboard.bookings.massage')}
              value={specialists.byType.massage}
              variant="sage"
            />
          </div>
        </KPICard>
      </div>

      {/* ── Row 2: Massage workload alert ─────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center justify-between gap-4 rounded-2xl border px-5 py-4',
          specialists.massageWorkload.belowTarget > 0
            ? 'bg-amber-950/30 border-amber-800/40'
            : 'bg-sage/5 border-sage/20',
        )}
      >
        <div className="flex items-center gap-3">
          {specialists.massageWorkload.belowTarget > 0 ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle className="w-5 h-5 text-sage shrink-0" aria-hidden="true" />
          )}
          <div>
            <p
              className={cn(
                'text-sm font-medium',
                specialists.massageWorkload.belowTarget > 0 ? 'text-amber-300' : 'text-sage',
              )}
            >
              {specialists.massageWorkload.belowTarget > 0
                ? t('dashboard.workload.below').replace(
                    '{n}',
                    String(specialists.massageWorkload.belowTarget),
                  )
                : t('dashboard.workload.met')}
            </p>
            {specialists.massageWorkload.belowTarget > 0 && (
              <p className="text-xs text-text-tertiary mt-0.5">
                {t('dashboard.workload.subtitle').replace('{n}', '6')}
              </p>
            )}
          </div>
        </div>
        {specialists.massageWorkload.belowTarget > 0 && (
          <Link
            href="/specialists?filter=massage-below-target"
            className="shrink-0 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors underline underline-offset-2"
          >
            {t('dashboard.workload.viewAll')}
          </Link>
        )}
      </div>
    </div>
  );
}
