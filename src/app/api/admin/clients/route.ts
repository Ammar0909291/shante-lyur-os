export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') ?? '';
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '50')));

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
          role: 'CLIENT' as const,
        }
      : { role: 'CLIENT' as const };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          customerProfile: { select: { id: true, loyaltyTier: true, totalVisits: true, totalSpent: true, lastVisitAt: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      profileId: u.customerProfile?.id ?? null,
      loyaltyTier: u.customerProfile?.loyaltyTier ?? null,
      totalVisits: u.customerProfile?.totalVisits ?? 0,
      totalSpent: u.customerProfile ? Number(u.customerProfile.totalSpent) : 0,
      lastVisitAt: u.customerProfile?.lastVisitAt ?? null,
    }));

    return ok({ items, total, page, limit });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
