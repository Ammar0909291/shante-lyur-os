export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const specialist = await prisma.specialist.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd    = new Date(todayStart.getTime() + 7 * 86400000);

  const appointments = await prisma.appointment.findMany({
    where: {
      specialistId: specialist.id,
      startAt: { gte: todayStart, lt: weekEnd },
      status: { notIn: ['CANCELLED'] },
    },
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      notes: true,
      room: { select: { name: true } },
      client: { select: { firstName: true, lastName: true } },
      services: { select: { service: { select: { name: true, baseDuration: true } } } },
    },
  });

  // Group by date string dd.MM.yyyy
  const grouped: Record<string, unknown[]> = {};
  for (const a of appointments) {
    const d = a.startAt;
    const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    if (!grouped[key]) grouped[key] = [];
    const firstName = a.client?.firstName ?? '—';
    const lastInitial = a.client?.lastName ? a.client.lastName[0] + '.' : '';
    grouped[key].push({
      id: a.id,
      status: a.status,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      notes: a.notes,
      room: a.room?.name ?? null,
      client: { displayName: `${firstName} ${lastInitial}`.trim() },
      services: a.services.map((s) => ({ name: s.service.name, duration: s.service.baseDuration })),
    });
  }

  return ok({ days: grouped });
}
