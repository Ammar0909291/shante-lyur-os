export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400, extra?: object) {
  return NextResponse.json({ success: false, error: { message: msg, ...extra } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const MIN_PER_DEPT = 6;

const patchSchema = z.object({
  status:      z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(500).optional(),
  override:    z.boolean().optional(),
});

interface ScheduleDay { date: string; isWorkDay: boolean }
interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);
  if (!ADMIN_ROLES.includes(role)) return err('Requires Admin role', 403);

  const { id } = await context.params;

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON body', 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err('Validation failed: ' + parsed.error.issues[0]?.message, 400);

  const { status, reviewNotes, override = false } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schedReq = await (prisma as any).scheduleRequest.findUnique({
    where: { id },
    include: {
      specialist: {
        select: {
          id: true,
          department: true,
          userId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!schedReq) return err('Schedule request not found', 404);
  if (schedReq.status !== 'PENDING') return err('Request already reviewed', 409);

  // Coverage check only when approving
  if (status === 'APPROVED' && !override) {
    const dept: string = schedReq.specialist.department;
    if (dept === 'MASSAGE' || dept === 'COSMETOLOGY') {
      const thisDays = (schedReq.days ?? []) as ScheduleDay[];
      const workDates = thisDays.filter((d) => d.isWorkDay).map((d) => d.date);

      if (workDates.length > 0) {
        // Get all other APPROVED requests for this month (excluding this one)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const otherApproved = await (prisma as any).scheduleRequest.findMany({
          where: { month: schedReq.month, status: 'APPROVED', id: { not: id } },
          include: { specialist: { select: { department: true } } },
        });

        // Build coverage from already-approved requests
        const coverage: Record<string, { MASSAGE: number; COSMETOLOGY: number }> = {};
        for (const r of otherApproved) {
          const d2 = r.specialist.department;
          if (d2 !== 'MASSAGE' && d2 !== 'COSMETOLOGY') continue;
          const days2 = (r.days ?? []) as ScheduleDay[];
          for (const day of days2) {
            if (!day.isWorkDay) continue;
            if (!coverage[day.date]) coverage[day.date] = { MASSAGE: 0, COSMETOLOGY: 0 };
            coverage[day.date][d2 as 'MASSAGE' | 'COSMETOLOGY']++;
          }
        }

        // Add this request to see what coverage looks like after approval
        for (const date of workDates) {
          if (!coverage[date]) coverage[date] = { MASSAGE: 0, COSMETOLOGY: 0 };
          coverage[date][dept as 'MASSAGE' | 'COSMETOLOGY']++;
        }

        // Find days where the OTHER department is still under-staffed
        // (we only check the opposite dept since this specialist adds to their own dept)
        const otherDept = dept === 'MASSAGE' ? 'COSMETOLOGY' : 'MASSAGE';
        const understaffedDays = workDates.filter((date) => {
          const c = coverage[date];
          return !c || c[otherDept as 'MASSAGE' | 'COSMETOLOGY'] < MIN_PER_DEPT;
        });

        // Check own dept coverage on ALL days of the month (not just work days)
        const [y, m] = schedReq.month.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const ownUnderstaffed: string[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const c = coverage[date];
          const ownCount = c ? c[dept as 'MASSAGE' | 'COSMETOLOGY'] : 0;
          if (ownCount > 0 && ownCount < MIN_PER_DEPT) ownUnderstaffed.push(date);
        }

        const allAlerts = [...new Set([...understaffedDays, ...ownUnderstaffed])].sort();
        if (allAlerts.length > 0) {
          return err(
            `Некоторые дни будут иметь недостаточно специалистов (минимум ${MIN_PER_DEPT}). Используйте override для принудительного одобрения.`,
            422,
            { coverageAlerts: allAlerts },
          );
        }
      }
    }
  }

  // Apply the decision
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).scheduleRequest.update({
    where: { id },
    data: {
      status,
      reviewedBy:  userId,
      reviewNotes: reviewNotes ?? null,
      reviewedAt:  new Date(),
    },
  });

  // Notify the specialist
  const statusLabel = status === 'APPROVED' ? 'одобрен' : 'отклонён';
  await prisma.notification.create({
    data: {
      id:      crypto.randomUUID(),
      userId:  schedReq.specialist.userId,
      type:    'STAFF_ALERT',
      channel: 'IN_APP',
      status:  'SENT',
      title:   `График на ${schedReq.month} ${statusLabel}`,
      body:    reviewNotes
        ? `Комментарий администратора: ${reviewNotes}`
        : `Ваш график на ${schedReq.month} был ${statusLabel}.`,
      data:    { scheduleRequestId: id, month: schedReq.month },
      sentAt:  new Date(),
    },
  });

  return ok({ id, status, reviewNotes: reviewNotes ?? null });
}
