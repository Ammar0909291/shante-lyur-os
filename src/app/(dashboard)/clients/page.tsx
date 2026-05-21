export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { Users, Star, Archive, TrendingUp, TrendingDown, UserCheck, UserX } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/infrastructure/config/prisma-client';
import { formatCurrency, formatClientRef } from '@/lib/utils';
import { AddClientButton } from './_components/AddClientButton';
import { ClientSearchBox } from './_components/ClientSearchBox';

// Loyalty tier display config — VIP = Diamond (highest)
const LOYALTY_LABEL: Record<string, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
  PLATINUM: 'Платина',
  VIP: 'Бриллиант',
};

const LOYALTY_SORT: Record<string, number> = {
  VIP: 0,
  PLATINUM: 1,
  GOLD: 2,
  SILVER: 3,
  BRONZE: 4,
};

const LOYALTY_VARIANT: Record<string, 'default' | 'gold' | 'success' | 'info'> = {
  BRONZE: 'default',
  SILVER: 'default',
  GOLD: 'gold',
  PLATINUM: 'gold',
  VIP: 'success',
};

const LOYALTY_ICON_COLOR: Record<string, string> = {
  VIP: 'text-blue-400',
  PLATINUM: 'text-purple-400',
  GOLD: 'text-champagne',
  SILVER: 'text-text-secondary',
  BRONZE: 'text-amber-700',
};

async function getAnalytics(period: string, from?: string, to?: string) {
  const now = new Date();
  let periodStart: Date;
  let previousStart: Date;
  let previousEnd: Date;

  if (period === 'custom' && from && to) {
    periodStart = new Date(from);
    const duration = now.getTime() - periodStart.getTime();
    previousEnd = new Date(periodStart.getTime() - 1);
    previousStart = new Date(previousEnd.getTime() - duration);
  } else {
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : period === 'quarterly' ? 90 : 365;
    periodStart = new Date(now.getTime() - days * 86400000);
    previousStart = new Date(periodStart.getTime() - days * 86400000);
    previousEnd = new Date(periodStart.getTime() - 1);
  }

  const endDate = (period === 'custom' && to) ? new Date(to) : now;

  const [totalActive, totalNonActive, newInPeriod, previousPeriodNew] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT', status: { not: 'SUSPENDED' } } }),
    prisma.user.count({ where: { role: 'CLIENT', status: 'SUSPENDED' } }),
    prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: periodStart, lte: endDate } } }),
    prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: previousStart, lte: previousEnd } } }),
  ]);

  return { totalActive, totalNonActive, newInPeriod, previousPeriodNew };
}

async function getClients(page: number, search: string, showArchived: boolean) {
  const limit = 50;
  const statusFilter = showArchived
    ? { status: 'SUSPENDED' as const }
    : { status: { not: 'SUSPENDED' as const } };

  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
        role: 'CLIENT' as const,
        ...statusFilter,
      }
    : { role: 'CLIENT' as const, ...statusFilter };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        customerProfile: {
          select: { loyaltyTier: true, totalVisits: true, totalSpent: true, lastVisitAt: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Sort by loyalty tier priority (Diamond/VIP first)
  const sorted = [...users].sort((a, b) => {
    const ta = a.customerProfile?.loyaltyTier ?? 'BRONZE';
    const tb = b.customerProfile?.loyaltyTier ?? 'BRONZE';
    const diff = (LOYALTY_SORT[ta] ?? 99) - (LOYALTY_SORT[tb] ?? 99);
    if (diff !== 0) return diff;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'ru');
  });

  return { users: sorted, total, limit };
}

function StatAnalyticsCard({
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
    red: 'bg-red-500/10 text-red-400',
    gold: 'bg-champagne/10 text-champagne',
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

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Сегодня' },
  { value: 'weekly', label: '7 дней' },
  { value: 'monthly', label: '30 дней' },
  { value: 'quarterly', label: '90 дней' },
  { value: 'yearly', label: 'Год' },
];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; archived?: string; period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const page         = Math.max(1, Number(sp.page ?? '1'));
  const search       = sp.search ?? '';
  const showArchived = sp.archived === 'true';
  const period       = sp.period ?? 'monthly';

  const [{ users, total, limit }, analytics] = await Promise.all([
    getClients(page, search, showArchived),
    getAnalytics(period, sp.from, sp.to),
  ]);
  const totalPages = Math.ceil(total / limit);

  const gainDelta = analytics.previousPeriodNew > 0
    ? Math.round(((analytics.newInPeriod - analytics.previousPeriodNew) / analytics.previousPeriodNew) * 100)
    : null;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Клиенты</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {total.toLocaleString('ru-RU')} {showArchived ? 'архивных клиентов' : 'активных клиентов'}
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
            {showArchived ? 'Активные клиенты' : 'Архивные'}
          </Link>
          {!showArchived && <AddClientButton />}
        </div>
      </div>

      {/* Analytics period filter */}
      {!showArchived && (
        <div className="mb-5">
          <div className="flex gap-2 flex-wrap">
            {PERIOD_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/clients?period=${opt.value}`}
                className={`px-3.5 py-1.5 rounded-xl text-sm transition-colors ${
                  period === opt.value
                    ? 'bg-champagne text-obsidian font-medium'
                    : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Analytics cards */}
      {!showArchived && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatAnalyticsCard
            icon={<UserCheck className="w-5 h-5" />}
            label="Активные клиенты"
            value={analytics.totalActive.toLocaleString('ru-RU')}
            accent="green"
          />
          <StatAnalyticsCard
            icon={<UserX className="w-5 h-5" />}
            label="Неактивные клиенты"
            value={analytics.totalNonActive.toLocaleString('ru-RU')}
            accent="red"
          />
          <StatAnalyticsCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Новых клиентов"
            value={analytics.newInPeriod.toLocaleString('ru-RU')}
            sub={gainDelta !== null ? `${gainDelta >= 0 ? '+' : ''}${gainDelta}% vs пред. период` : undefined}
            accent="gold"
          />
          <StatAnalyticsCard
            icon={<TrendingDown className="w-5 h-5" />}
            label="Потеряно клиентов"
            value={analytics.totalNonActive.toLocaleString('ru-RU')}
            sub="Архивированы"
            accent="default"
          />
        </div>
      )}

      {/* Live search */}
      <div className="mb-6">
        <ClientSearchBox defaultValue={search} />
      </div>

      {users.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <Users className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">
            {search ? 'Клиентов по запросу не найдено' : 'Клиентов пока нет'}
          </p>
        </div>
      ) : (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-luxury">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Лояльность</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Визиты</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Потрачено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-luxury">
                {users.map((u) => {
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
                            {LOYALTY_LABEL[tier] ?? tier}
                          </Badge>
                        ) : (
                          <span className="text-text-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-text-secondary tabular-nums">
                        {u.customerProfile?.totalVisits ?? 0}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-text-primary tabular-nums">
                        {u.customerProfile
                          ? formatCurrency(Number(u.customerProfile.totalSpent))
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-border-luxury">
            {users.map((u) => (
              <Link key={u.id} href={`/clients/${u.id}`} className="px-4 py-4 flex items-start gap-3 hover:bg-charcoal/50 transition-colors">
                <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary text-sm">
                      {u.firstName} {u.lastName}
                    </span>
                    {u.customerProfile?.loyaltyTier && (
                      <Badge variant={LOYALTY_VARIANT[u.customerProfile.loyaltyTier] ?? 'default'}>
                        {LOYALTY_LABEL[u.customerProfile.loyaltyTier] ?? u.customerProfile.loyaltyTier}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{u.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-tertiary">
                      {u.customerProfile?.totalVisits ?? 0} визитов
                    </span>
                    {u.customerProfile && (
                      <>
                        <span className="text-xs text-text-tertiary">·</span>
                        <span className="text-xs text-champagne">
                          {formatCurrency(Number(u.customerProfile.totalSpent))}
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
            Страница {page} из {totalPages} · {total} клиентов
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${showArchived ? '&archived=true' : ''}&period=${period}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                ← Назад
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${showArchived ? '&archived=true' : ''}&period=${period}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                Вперёд →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
