export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const ALLOWED_STATUSES = ['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const from      = searchParams.get('from');
  const to        = searchParams.get('to');
  const statusRaw = searchParams.get('status');
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  if (!from || !to) return err('from and to are required');

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true, department: true } });
  if (!specialist) return err('Specialist not found', 404);

  // Categories excluded for each department (so cosmetologists don't see massage, vice versa)
  const EXCLUDED_CATEGORY: Record<string, string> = { COSMETOLOGY: 'MASSAGE', MASSAGE: 'COSMETOLOGY' };
  const excludedCategory = EXCLUDED_CATEGORY[specialist.department] ?? null;

  const statusFilter = statusRaw && ALLOWED_STATUSES.includes(statusRaw)
    ? { status: statusRaw as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED' }
    : {};

  const where = {
    specialistId: specialist.id,
    startAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') },
    ...statusFilter,
  };

  const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

  const [total, items] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { startAt: 'desc' },
      include: {
        client:   { select: { firstName: true, lastName: true } },
        services: { include: { service: { select: { name: true, category: true } } } },
      },
    }),
  ]);

  const procedures = items.map((a) => {
    const client = a.client;
    const clientName = isManager
      ? `${client.firstName} ${client.lastName}`.trim()
      : `${client.firstName} ${client.lastName.charAt(0)}.`.trim();
    return {
      id:          a.id,
      startAt:     a.startAt,
      endAt:       a.endAt,
      status:      a.status,
      clientName,
      services:    a.services
        .filter((s) => !excludedCategory || s.service.category !== excludedCategory)
        .map((s) => s.service.name)
        .join(', '),
      totalPrice:  Number(a.totalPrice),
      duration:    a.totalDuration,
    };
  });

  return ok({ procedures, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
