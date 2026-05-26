export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const MIN_PER_DEPT = 6;

interface ScheduleDay { date: string; isWorkDay: boolean }
interface Coverage { MASSAGE: number; COSMETOLOGY: number }

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);
  if (!ADMIN_ROLES.includes(role)) return err('Requires Admin role', 403);

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = searchParams.get('month') ?? defaultMonth;

  if (!/^\d{4}-\d{2}$/.test(month)) return err('Invalid month format (YYYY-MM)', 400);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRequests = await (prisma as any).scheduleRequest.findMany({
    where: { month },
    include: {
      specialist: {
        select: {
          id: true,
          department: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  // Build daily coverage map across all PENDING + APPROVED requests
  const coverage: Record<string, Coverage> = {};

  for (const r of rawRequests) {
    if (r.status === 'REJECTED') continue;
    const dept: string = r.specialist.department;
    if (dept !== 'MASSAGE' && dept !== 'COSMETOLOGY') continue;
    const days = (r.days ?? []) as ScheduleDay[];
    for (const d of days) {
      if (!d.isWorkDay) continue;
      if (!coverage[d.date]) coverage[d.date] = { MASSAGE: 0, COSMETOLOGY: 0 };
      coverage[d.date][dept as 'MASSAGE' | 'COSMETOLOGY']++;
    }
  }

  // Days with insufficient coverage
  const alerts = Object.entries(coverage)
    .filter(([, c]) => c.MASSAGE < MIN_PER_DEPT || c.COSMETOLOGY < MIN_PER_DEPT)
    .map(([date]) => date)
    .sort();

  const requests = rawRequests.map((r: typeof rawRequests[0]) => ({
    id:            r.id,
    specialistId:  r.specialistId,
    specialistName:`${r.specialist.user.firstName} ${r.specialist.user.lastName}`.trim(),
    department:    r.specialist.department,
    status:        r.status,
    days:          r.days,
    workDayCount:  ((r.days ?? []) as ScheduleDay[]).filter((d) => d.isWorkDay).length,
    note:          r.note,
    submittedAt:   r.submittedAt,
    reviewNotes:   r.reviewNotes,
    reviewedAt:    r.reviewedAt,
  }));

  return ok({ month, requests, coverage, alerts });
}
