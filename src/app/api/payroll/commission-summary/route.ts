export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  const params = req.nextUrl.searchParams;
  const from   = params.get('from') ? new Date(params.get('from')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to     = params.get('to')   ? new Date(params.get('to')!)   : new Date();

  const entries = await prisma.saleCommissionEntry.findMany({
    where: { saleDate: { gte: from, lte: to } },
    select: {
      userId: true,
      commissionAmount: true,
      status: true,
      roleOnSale: true,
      appointmentId: true,
      appointment: {
        select: {
          services: { select: { performedBySpecialistId: true } },
        },
      },
      user: {
        select: {
          id: true, firstName: true, lastName: true, role: true, avatarUrl: true,
          specialist: { select: { department: true, specialization: true } },
        },
      },
    },
  });

  // Fetch specialistId for all users
  const userIds = [...new Set(entries.map((e) => e.userId))];
  const specialists = await prisma.specialist.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  });
  const userToSpecialistId = new Map(specialists.map((s) => [s.userId, s.id]));

  // Group by userId
  const userMap = new Map<string, {
    userId: string; specialistId: string | null; name: string; role: string; department: string | null;
    specialization: string | null; avatarUrl: string | null;
    totalApproved: number; pendingCount: number; procedureCount: number;
  }>();

  for (const e of entries) {
    const key = e.userId;
    if (!userMap.has(key)) {
      userMap.set(key, {
        userId:        e.user.id,
        specialistId:  userToSpecialistId.get(e.user.id) ?? null,
        name:          `${e.user.firstName} ${e.user.lastName}`,
        role:          e.user.role,
        department:    e.user.specialist?.department ?? null,
        specialization: e.user.specialist?.specialization ?? null,
        avatarUrl:     e.user.avatarUrl,
        totalApproved: 0,
        pendingCount:  0,
        procedureCount: 0,
      });
    }
    const row = userMap.get(key)!;
    if (e.status === 'APPROVED' || e.status === 'PAID') {
      row.totalApproved += Number(e.commissionAmount);
    }
    if (e.status === 'PENDING') row.pendingCount++;
    row.procedureCount += e.appointment.services.length;
  }

  return ok({ employees: [...userMap.values()] });
}
