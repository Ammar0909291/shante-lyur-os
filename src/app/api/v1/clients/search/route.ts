export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const querySchema = z.object({
  q:     z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

type UserRow = {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  customerProfile: {
    clientType?: string | null; lastVisitAt: Date | null;
    totalVisits: number; loyaltyPoints: number; loyaltyTier: string;
  } | null;
};

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return R.unauthorized();

  const rawQ     = req.nextUrl.searchParams.get('q') ?? '';
  const rawLimit = req.nextUrl.searchParams.get('limit') ?? '10';

  if (rawQ.trim().length < 2) {
    return R.success({ items: [] });
  }

  const parsed = querySchema.safeParse({ q: rawQ, limit: rawLimit });
  if (!parsed.success) return R.badRequest('Invalid query parameters');

  const { q, limit } = parsed.data;

  const parts     = q.trim().split(/\s+/);
  const isTwoPart = parts.length >= 2;

  const where = {
    role:   'CLIENT' as const,
    status: { not: 'SUSPENDED' as const },
    OR: [
      { firstName: { contains: q, mode: 'insensitive' as const } },
      { lastName:  { contains: q, mode: 'insensitive' as const } },
      { email:     { contains: q, mode: 'insensitive' as const } },
      { phone:     { contains: q, mode: 'insensitive' as const } },
      ...(isTwoPart
        ? [
            { AND: [
                { firstName: { contains: parts[0] ?? '', mode: 'insensitive' as const } },
                { lastName:  { contains: parts[1] ?? '', mode: 'insensitive' as const } },
            ] },
            { AND: [
                { firstName: { contains: parts[1] ?? '', mode: 'insensitive' as const } },
                { lastName:  { contains: parts[0] ?? '', mode: 'insensitive' as const } },
            ] },
          ]
        : []),
    ],
  };

  const order = [{ lastName: 'asc' as const }, { firstName: 'asc' as const }];

  let users: UserRow[];

  try {
    // Try full query including clientType (requires column to exist and be non-null)
    users = await prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        customerProfile: {
          select: {
            clientType: true, lastVisitAt: true,
            totalVisits: true, loyaltyPoints: true, loyaltyTier: true,
          },
        },
      },
      orderBy: order,
      take: limit,
    }) as UserRow[];
  } catch {
    // Fallback: client_type column missing or has NULL values — query without it
    const rows = await prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        customerProfile: {
          select: {
            lastVisitAt: true, totalVisits: true,
            loyaltyPoints: true, loyaltyTier: true,
          },
        },
      },
      orderBy: order,
      take: limit,
    });
    users = rows.map((u) => ({
      ...u,
      customerProfile: u.customerProfile
        ? { ...u.customerProfile, clientType: null }
        : null,
    }));
  }

  const items = users.map((u) => ({
    id:            u.id,
    firstName:     u.firstName,
    lastName:      u.lastName,
    fullName:      `${u.firstName} ${u.lastName}`.trim(),
    email:         u.email,
    phone:         u.phone,
    clientType:    u.customerProfile?.clientType   ?? 'RETURNING',
    lastVisitAt:   u.customerProfile?.lastVisitAt?.toISOString() ?? null,
    totalVisits:   u.customerProfile?.totalVisits  ?? 0,
    loyaltyPoints: u.customerProfile?.loyaltyPoints ?? 0,
    loyaltyTier:   u.customerProfile?.loyaltyTier  ?? 'BRONZE',
    blacklisted:   false,
  }));

  return R.success({ items });
}
