export const dynamic = 'force-dynamic';

import * as React from 'react';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ClientsContent, type SerializedUser, type ClientsAnalytics } from './_components/ClientsContent';

const LOYALTY_SORT: Record<string, number> = {
  VIP: 0, PLATINUM: 1, GOLD: 2, SILVER: 3, BRONZE: 4,
};

async function getAnalytics(period: string, from?: string, to?: string): Promise<ClientsAnalytics> {
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

  // Serialize: convert Decimal to number
  const serialized: SerializedUser[] = sorted.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    customerProfile: u.customerProfile
      ? {
          loyaltyTier: u.customerProfile.loyaltyTier,
          totalVisits: u.customerProfile.totalVisits,
          totalSpent: Number(u.customerProfile.totalSpent),
          lastVisitAt: u.customerProfile.lastVisitAt?.toISOString() ?? null,
        }
      : null,
  }));

  return { users: serialized, total, limit };
}

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

  return (
    <ClientsContent
      users={users}
      total={total}
      totalPages={totalPages}
      page={page}
      search={search}
      showArchived={showArchived}
      period={period}
      analytics={analytics}
    />
  );
}
