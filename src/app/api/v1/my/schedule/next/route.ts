export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const daySchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isWorkDay: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

const postSchema = z.object({
  days: z.array(daySchema).min(1),
  note: z.string().max(1000).optional(),
});

function nextMonth(): { year: number; month: number; monthStr: string } {
  const now   = new Date();
  const year  = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  return { year, month, monthStr: `${year}-${String(month + 1).padStart(2, '0')}` };
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const { monthStr } = nextMonth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).scheduleRequest.findUnique({
    where: { specialistId_month: { specialistId: specialist.id, month: monthStr } },
  });

  return ok({
    month:   monthStr,
    request: existing
      ? {
          id:          existing.id,
          status:      existing.status,
          days:        existing.days,
          note:        existing.note,
          reviewNotes: existing.reviewNotes,
          submittedAt: existing.submittedAt,
          reviewedAt:  existing.reviewedAt,
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return err('Unauthorized', 401);

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const { monthStr } = nextMonth();

  // Once submitted, employee CANNOT resubmit or change — only admin can
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).scheduleRequest.findUnique({
    where: { specialistId_month: { specialistId: specialist.id, month: monthStr } },
    select: { id: true, status: true },
  });
  if (existing) {
    return err('Заявка уже подана и не может быть изменена. Обратитесь к администратору.', 409);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON body', 400); }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return err('Validation failed: ' + parsed.error.issues[0]?.message, 400);

  const { days, note } = parsed.data;

  // Validate that all dates belong to next month
  const { year, month } = nextMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (const d of days) {
    const [dy, dm] = d.date.split('-').map(Number);
    if (dy !== year || dm !== month + 1) {
      return err(`Date ${d.date} does not belong to ${monthStr}`, 400);
    }
    if (parseInt(d.date.split('-')[2], 10) > daysInMonth) {
      return err(`Invalid date ${d.date}`, 400);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = await (prisma as any).scheduleRequest.create({
    data: {
      specialistId: specialist.id,
      month:        monthStr,
      days:         days as object[],
      note:         note ?? null,
      status:       'PENDING',
      submittedAt:  new Date(),
    },
  });

  // Dispatch BullMQ notification (fire-and-forget)
  try {
    const { notificationsQueue } = await import('@/infrastructure/queues/queue-registry');
    await notificationsQueue.add('schedule-request-submitted', {
      notificationId: request.id,
      channel:        'in_app',
      recipientId:    userId,
      templateKey:    'SCHEDULE_REQUEST_SUBMITTED',
      data: { month: monthStr, specialistId: specialist.id },
    });
  } catch {
    // queue failure must not break the response
  }

  return ok({
    id:          request.id,
    status:      request.status,
    month:       request.month,
    submittedAt: request.submittedAt,
  });
}
