export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const skip   = (page - 1) * limit;
  const tier   = searchParams.get('tier')   ?? '';
  const search = searchParams.get('search') ?? '';

  const where: Record<string, unknown> = {};
  if (tier) where.loyaltyTier = tier;
  if (search) {
    where.user = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { phone:     { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    prisma.customerProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { loyaltyPoints: 'desc' },
      include: {
        user: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            phone:     true,
          },
        },
      },
    }),
    prisma.customerProfile.count({ where }),
  ]);

  return R.success({
    items: items.map((p) => ({
      userId:       p.userId,
      firstName:    p.user.firstName,
      lastName:     p.user.lastName,
      phone:        p.user.phone,
      loyaltyTier:  p.loyaltyTier,
      loyaltyPoints: p.loyaltyPoints,
      totalVisits:  p.totalVisits,
      totalSpent:   Number(p.totalSpent),
      lastVisitAt:  p.lastVisitAt?.toISOString() ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
