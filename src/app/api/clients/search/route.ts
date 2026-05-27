export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}


export async function GET(req: NextRequest) {
  try {
    const q     = (req.nextUrl.searchParams.get('q') ?? req.nextUrl.searchParams.get('search') ?? '').trim();
    const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '10')));

    const userSelect = {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      customerProfile: { select: { clientType: true, lastVisitAt: true } },
    } as const;

    if (!q) {
      const recent = await prisma.user.findMany({
        where:   { role: 'CLIENT', status: { not: 'SUSPENDED' } },
        select:  userSelect,
        orderBy: { createdAt: 'desc' },
        take:    limit,
      });
      return ok({ items: recent.map(mapUser) });
    }

    const refMatch  = q.match(/^(?:CL-)?([0-9A-Fa-f]{4,8})$/);
    const uuidPrefix = refMatch ? refMatch[1].toLowerCase() : null;

    const users = await prisma.user.findMany({
      where: {
        role:   'CLIENT',
        status: { not: 'SUSPENDED' },
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName:  { contains: q, mode: 'insensitive' } },
          { email:     { contains: q, mode: 'insensitive' } },
          { phone:     { contains: q, mode: 'insensitive' } },
          ...(q.includes(' ')
            ? [
                {
                  AND: [
                    { firstName: { contains: q.split(' ')[1] ?? '', mode: 'insensitive' as const } },
                    { lastName:  { contains: q.split(' ')[0] ?? '', mode: 'insensitive' as const } },
                  ],
                },
                {
                  AND: [
                    { firstName: { contains: q.split(' ')[0] ?? '', mode: 'insensitive' as const } },
                    { lastName:  { contains: q.split(' ')[1] ?? '', mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
          ...(uuidPrefix ? [{ email: { contains: uuidPrefix, mode: 'insensitive' as const } }] : []),
        ],
      },
      select:  userSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take:    limit,
    });

    return ok({ items: users.map(mapUser) });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

function mapUser(u: {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  customerProfile: { clientType: string; lastVisitAt: Date | null } | null;
}) {
  return {
    id:          u.id,
    firstName:   u.firstName,
    lastName:    u.lastName,
    email:       u.email,
    phone:       u.phone,
    clientRef:   'CL-' + u.id.replace(/-/g, '').substring(0, 8).toUpperCase(),
    clientType:  u.customerProfile?.clientType ?? 'RETURNING',
    lastVisitAt: u.customerProfile?.lastVisitAt?.toISOString() ?? null,
  };
}
