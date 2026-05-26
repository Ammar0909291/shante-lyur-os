export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)));

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const now = new Date();
  const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

  const [upcoming, recent] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        specialistId: specialist.id,
        startAt: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      take:    limit,
      orderBy: { startAt: 'asc' },
      include: {
        client:   { select: { firstName: true, lastName: true } },
        services: { include: { service: { select: { name: true } } } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        specialistId: specialist.id,
        startAt: { lt: now },
        status: { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] },
      },
      take:    5,
      orderBy: { startAt: 'desc' },
      include: {
        client:   { select: { firstName: true, lastName: true } },
        services: { include: { service: { select: { name: true } } } },
      },
    }),
  ]);

  function mapBooking(a: typeof upcoming[0]) {
    const clientName = isManager
      ? `${a.client.firstName} ${a.client.lastName}`.trim()
      : `${a.client.firstName} ${a.client.lastName.charAt(0)}.`.trim();
    return {
      id:         a.id,
      startAt:    a.startAt,
      endAt:      a.endAt,
      status:     a.status,
      clientName,
      services:   a.services.map((s) => s.service.name).join(', '),
      totalPrice: Number(a.totalPrice),
      duration:   a.totalDuration,
    };
  }

  return ok({ upcoming: upcoming.map(mapBooking), recent: recent.map(mapBooking) });
}
