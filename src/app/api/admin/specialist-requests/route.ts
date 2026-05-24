export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiErr(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return apiErr('UNAUTHORIZED', 'Authentication required', 401);
  if (!ADMIN_ROLES.includes(role)) return apiErr('FORBIDDEN', 'Admin access required', 403);

  const [leave, schedule, capability] = await Promise.all([
    prisma.leaveRequest.findMany({
      include: { specialist: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.scheduleChangeRequest.findMany({
      include: { specialist: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.capabilityRequest.findMany({
      include: {
        specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
        service: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return ok({
    leave: leave.map((r) => ({
      id: r.id,
      specialistId: r.specialistId,
      specialistName: `${r.specialist.user.firstName} ${r.specialist.user.lastName}`,
      date: r.date,
      reason: r.reason,
      status: r.status,
      reviewNotes: r.reviewNotes,
      createdAt: r.createdAt,
    })),
    schedule: schedule.map((r) => ({
      id: r.id,
      specialistId: r.specialistId,
      specialistName: `${r.specialist.user.firstName} ${r.specialist.user.lastName}`,
      description: r.description,
      status: r.status,
      reviewNotes: r.reviewNotes,
      createdAt: r.createdAt,
    })),
    service: capability.map((r) => ({
      id: r.id,
      specialistId: r.specialistId,
      specialistName: `${r.specialist.user.firstName} ${r.specialist.user.lastName}`,
      serviceId: r.serviceId,
      serviceName: r.service.name,
      note: r.note,
      status: r.status,
      reviewNotes: r.reviewNotes,
      createdAt: r.createdAt,
    })),
  });
}
