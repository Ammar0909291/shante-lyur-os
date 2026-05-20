export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function formatClientRef(uuid: string): string {
  return 'CL-' + uuid.replace(/-/g, '').substring(0, 8).toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get('q') ?? req.nextUrl.searchParams.get('search') ?? '').trim();
    const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '10')));

    if (!q) {
      const recent = await prisma.user.findMany({
        where: { role: 'CLIENT' },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return ok({ items: recent.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, clientRef: formatClientRef(u.id) })) });
    }

    // Check if query looks like a client reference (CL-XXXXXXXX or just hex chars)
    const refMatch = q.match(/^(?:CL-)?([0-9A-Fa-f]{4,8})$/);
    const uuidPrefix = refMatch ? refMatch[1].toLowerCase() : null;

    const users = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          // Support "Иванов Иван" combined search via lastName+firstName concatenation
          ...(q.includes(' ')
            ? [
                {
                  AND: [
                    { firstName: { contains: q.split(' ')[1] ?? '', mode: 'insensitive' as const } },
                    { lastName: { contains: q.split(' ')[0] ?? '', mode: 'insensitive' as const } },
                  ],
                },
                {
                  AND: [
                    { firstName: { contains: q.split(' ')[0] ?? '', mode: 'insensitive' as const } },
                    { lastName: { contains: q.split(' ')[1] ?? '', mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
          // UUID prefix search (for CL- reference lookup)
          ...(uuidPrefix ? [{ id: { startsWith: uuidPrefix } }] : []),
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: limit,
    });

    const items = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      clientRef: formatClientRef(u.id),
    }));

    return ok({ items });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
