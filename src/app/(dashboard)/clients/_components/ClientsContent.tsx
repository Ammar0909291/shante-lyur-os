'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, Star, Archive, TrendingUp, TrendingDown, UserCheck, UserX } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatClientRef } from '@/lib/utils';
import { AddClientButton } from './AddClientButton';
import { ClientSearchBox } from './ClientSearchBox';
import { useLanguage } from '@/contexts/language';

// Loyalty tier display config — VIP = Diamond (highest)
const LOYALTY_KEY: Record<string, string> = {
  BRONZE:   'clients.loyalty.bronze',
  SILVER:   'clients.loyalty.silver',
  GOLD:     'clients.loyalty.gold',
  PLATINUM: 'clients.loyalty.platinum',
  VIP:      'clients.loyalty.diamond',
};

const LOYALTY_SORT: Record<string, number> = {
  VIP: 0, PLATINUM: 1, GOLD: 2, SILVER: 3, BRONZE: 4,
};

const LOYALTY_VARIANT: Record<string, 'default' | 'gold' | 'success' | 'info'> = {
  BRONZE: 'default', SILVER: 'default', GOLD: 'gold', PLATINUM: 'gold', VIP: 'success',
};

const LOYALTY_ICON_COLOR: Record<string, string> = {
  VIP: 'text-blue-400', PLATINUM: 'text-purple-400', GOLD: 'text-champagne',
  SILVER: 'text-text-secondary', BRONZE: 'text-amber-700',
};

const PERIOD_VALUES = [
  { value: 'daily',     key: 'clients.period.today' },
  { value: 'weekly',    key: 'clients.period.7d' },
  { value: 'monthly',   key: 'clients.period.30d' },
  { value: 'quarterly', key: 'clients.period.90d' },
  { value: 'yearly',    key: 'clients.period.1y' },
];

export interface SerializedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  customerProfile: {
    loyaltyTier: string;
    totalVisits: number;
    totalSpent: number;
    lastVisitAt: string | null;
  } | null;
}

export interface ClientsAnalytics {
  totalActive: number;
  totalNonActive: number;
  newInPeriod: number;
  previousPeriodNew: number;
}

interface Props {
  users: SerializedUser[];
  total: number;
  totalPages: number;
  page: number;
  search: string;
  showArchived: boolean;
  period: string;
  analytics: ClientsAnalytics;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'red' | 'gold' | 'default';
}) {
  const accentCls = {
    green: 'bg-green-500/10 text-green-400',
    red:   'bg-red-500/10 text-red-400',
    gold:  'bg-champagne/10 text-champagne',
    default: 'bg-charcoal text-text-secondary',
  }[accent ?? 'default'];

  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl w-fit shrink-0 ${accentCls}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
        <p className="text-sm text-text-secondary mt-0.5">{label}</p>
        {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function ClientsContent({ users, total, totalPages, page, search, showArchived, period, analytics }: Props) {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';

  const loyaltyLabels = Object.fromEntries(Object.entries(LOYALTY_KEY).map(([k, v]) => [k, t(v)]));

  const gainDelta = analytics.previousPeriodNew > 0
    ? Math.round(((analytics.newInPeriod - analytics.previousPeriodNew) / analytics.previousPeriodNew) * 100)
    : null;

  const sortedUsers = [...users].sort((a, b) => {
    const ta = a.customerProfile?.loyaltyTier ?? 'BRONZE';
    const tb = b.customerProfile?.loyaltyTier ?? 'BRONZE';
    const diff = (LOYALTY_SORT[ta] ?? 99) - (LOYALTY_SORT[tb] ?? 99);
    if (diff !== 0) return diff;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, locale);
  });

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('clients.title')}</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {total.toLocaleString(locale)} {showArchived ? t('clients.archivedCount') : t('clients.activeCount')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={showArchived ? '/clients' : '/clients?archived=true'}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showArchived
                ? 'border-champagne/40 bg-champagne/10 text-champagne'
                : 'border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? t('clients.tab.active') : t('clients.tab.archived')}
          </Link>
          {!showArchived && <AddClientButton />}
        </div>
      </div>

      {/* Analytics period filter */}
      {!showArchived && (
        <div className="mb-5">
          <div className="flex gap-2 flex-wrap">
            {PERIOD_VALUES.map((opt) => (
              <Link
                key={opt.value}
                href={`/clients?period=${opt.value}`}
                className={`px-3.5 py-1.5 rounded-xl text-sm transition-colors ${
                  period === opt.value
                    ? 'bg-champagne text-obsidian font-medium'
                    : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal'
                }`}
              >
                {t(opt.key)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Analytics cards */}
      {!showArchived && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard
            icon={<UserCheck className="w-5 h-5" />}
            label={t('clients.analytics.active')}
            value={analytics.totalActive.toLocaleString(locale)}
            accent="green"
          />
          <StatCard
            icon={<UserX className="w-5 h-5" />}
            label={t('clients.analytics.inactive')}
            value={analytics.totalNonActive.toLocaleString(locale)}
            accent="red"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t('clients.analytics.new')}
            value={analytics.newInPeriod.toLocaleString(locale)}
            sub={gainDelta !== null ? `${gainDelta >= 0 ? '+' : ''}${gainDelta}${t('clients.analytics.vsPrev')}` : undefined}
            accent="gold"
          />
          <StatCard
            icon={<TrendingDown className="w-5 h-5" />}
            label={t('clients.analytics.lost')}
            value={analytics.totalNonActive.toLocaleString(locale)}
            sub={t('clients.analytics.archived')}
            accent="default"
          />
        </div>
      )}

      {/* Live search */}
      <div className="mb-6">
        <ClientSearchBox defaultValue={search} />
      </div>

      {sortedUsers.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <Users className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">
            {search ? t('clients.empty.search') : t('clients.empty.all')}
          </p>
        </div>
      ) : (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.client')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.email')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.loyalty')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.visits')}</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">{t('clients.col.spent')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {sortedUsers.map((u) => {
                  const tier = u.customerProfile?.loyaltyTier;
                  return (
                    <tr key={u.id} className="hover:bg-charcoal/50 transition-colors group">
                      <td className="px-6 py-3.5">
                        <Link href={`/clients/${u.id}`} className="flex items-center gap-3">
                          <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                          <div>
                            <span className="font-medium text-text-primary group-hover:text-champagne transition-colors">
                              {u.firstName} {u.lastName}
                            </span>
                            <p className="text-[10px] font-mono text-text-tertiary">{formatClientRef(u.id)}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">{u.email}</td>
                      <td className="px-4 py-3.5">
                        {tier ? (
                          <Badge variant={LOYALTY_VARIANT[tier] ?? 'default'}>
                            <Star className={`w-3 h-3 mr-1 ${LOYALTY_ICON_COLOR[tier] ?? ''}`} />
                            {loyaltyLabels[tier] ?? tier}
                          </Badge>
                        ) : (
                          <span className="text-text-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-text-secondary tabular-nums">
                        {u.customerProfile?.totalVisits ?? 0}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-text-primary tabular-nums">
                        {u.customerProfile ? formatCurrency(u.customerProfile.totalSpent) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-border-luxury">
            {sortedUsers.map((u) => (
              <Link key={u.id} href={`/clients/${u.id}`} className="px-4 py-4 flex items-start gap-3 hover:bg-charcoal/50 transition-colors">
                <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary text-sm">
                      {u.firstName} {u.lastName}
                    </span>
                    {u.customerProfile?.loyaltyTier && (
                      <Badge variant={LOYALTY_VARIANT[u.customerProfile.loyaltyTier] ?? 'default'}>
                        {loyaltyLabels[u.customerProfile.loyaltyTier] ?? u.customerProfile.loyaltyTier}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{u.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-tertiary">
                      {u.customerProfile?.totalVisits ?? 0} {t('clients.visits')}
                    </span>
                    {u.customerProfile && (
                      <>
                        <span className="text-xs text-text-tertiary">·</span>
                        <span className="text-xs text-champagne">
                          {formatCurrency(u.customerProfile.totalSpent)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-text-tertiary">
            {t('clients.pagination.page')} {page} {t('clients.pagination.of')} {totalPages} · {total} {t('clients.pagination.clients')}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${showArchived ? '&archived=true' : ''}&period=${period}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                {t('clients.pagination.prev')}
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${showArchived ? '&archived=true' : ''}&period=${period}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                {t('clients.pagination.next')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
