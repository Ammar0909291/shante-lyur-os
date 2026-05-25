export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  const [profiles, aggregates] = await Promise.all([
    prisma.customerProfile.groupBy({
      by: ['loyaltyTier'],
      _count: { _all: true },
    }),
    prisma.customerProfile.aggregate({
      _count: { _all: true },
      _sum:   { loyaltyPoints: true },
      _avg:   { loyaltyPoints: true },
    }),
  ]);

  const tierCounts: Record<string, number> = {
    BRONZE:   0,
    SILVER:   0,
    GOLD:     0,
    PLATINUM: 0,
    VIP:      0,
  };

  for (const row of profiles) {
    if (row.loyaltyTier in tierCounts) {
      tierCounts[row.loyaltyTier] = row._count._all;
    }
  }

  const totalClients          = aggregates._count._all;
  const totalPointsDistributed = aggregates._sum.loyaltyPoints ?? 0;
  const avgPoints              = aggregates._avg.loyaltyPoints ?? 0;

  return R.success({
    tierCounts,
    totalClients,
    totalPointsDistributed,
    avgPoints: Math.round(avgPoints),
  });
}
