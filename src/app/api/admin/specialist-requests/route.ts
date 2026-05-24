export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!ADMIN_ROLES.includes(role)) return err('FORBIDDEN', 'Admin access required', 403);

  const params = req.nextUrl.searchParams;
  const status = params.get('status') ?? 'PENDING';

  const [leaveReqs, scheduleReqs, capabilityReqs] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, date: true, reason: true, status: true, reviewNotes: true, createdAt: true,
        specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.scheduleChangeRequest.findMany({
      where: { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, description: true, status: true, reviewNotes: true, createdAt: true,
        specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.capabilityRequest.findMany({
      where: { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, note: true, status: true, reviewNotes: true, createdAt: true,
        specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
        service: { select: { name: true } },
      },
    }),
  ]);

  return ok({
    leave:    leaveReqs.map((r) => ({ ...r, type: 'leave' as const, date: (r.date as Date).toISOString().split('T')[0], specialistName: `${r.specialist.user.firstName} ${r.specialist.user.lastName}` })),
    schedule: scheduleReqs.map((r) => ({ ...r, type: 'schedule' as const, specialistName: `${r.specialist.user.firstName} ${r.specialist.user.lastName}` })),
    service:  capabilityReqs.map((r) => ({ ...r, type: 'service' as const, serviceName: r.service.name, specialistName: `${r.specialist.user.firstName} ${r.specialist.user.lastName}` })),
  });
}
