export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const { z } = await import('zod');
    const Schema = z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phone: z.string().min(7).max(30),
      email: z.string().email().optional(),
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request body', 400);

    const { firstName, lastName, phone, email } = parsed.data;
    const { randomUUID } = await import('crypto');
    const bcrypt = await import('bcryptjs');

    const emailAddr = email ?? `client+${randomUUID()}@shantelyur.internal`;
    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const userId = randomUUID();

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: emailAddr,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: 'CLIENT',
        status: 'ACTIVE',
        emailVerified: false,
        phoneVerified: false,
        customerProfile: {
          create: { id: randomUUID(), loyaltyTier: 'BRONZE' },
        },
      },
    });

    return ok({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      clientRef: 'CL-' + user.id.replace(/-/g, '').substring(0, 8).toUpperCase(),
    }, 201);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
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
