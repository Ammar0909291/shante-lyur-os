export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }

const UpsertSchema = z.object({
  specialistId:  z.string().uuid(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:        z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY', 'SICK_LEAVE', 'REMOTE']).optional(),
  checkInAt:     z.string().datetime({ offset: true }).optional().or(z.null()),
  checkOutAt:    z.string().datetime({ offset: true }).optional().or(z.null()),
  breakMinutes:  z.number().int().min(0).max(480).optional(),
  notes:         z.string().max(500).optional(),
});

// ─── GET /api/payroll/attendance ──────────────────────────────────────────────
// Query: ?specialistId?&from?&to?

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p = req.nextUrl.searchParams;
  const from = p.get('from');
  const to   = p.get('to');

  let specId = p.get('specialistId') ?? undefined;
  if (role === 'SPECIALIST') {
    const spec = await prisma.specialist.findFirst({ where: { userId: userId ?? '' }, select: { id: true } });
    specId = spec?.id;
    if (!spec) return ok({ records: [] });
  }

  try {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...(specId ? { specialistId: specId } : {}),
        ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      },
      include: {
        specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ date: 'desc' }, { specialistId: 'asc' }],
      take: 200,
    });

    return ok({
      records: records.map((r) => ({
        id:           r.id,
        specialistId: r.specialistId,
        specialistName: r.specialist.user ? `${r.specialist.user.firstName} ${r.specialist.user.lastName}` : '',
        date:         r.date.toISOString().split('T')[0],
        status:       r.status,
        checkInAt:    r.checkInAt,
        checkOutAt:   r.checkOutAt,
        breakMinutes: r.breakMinutes,
        workedHours:  r.checkInAt && r.checkOutAt
          ? Math.max(0, Math.round(((r.checkOutAt.getTime() - r.checkInAt.getTime()) / 3_600_000 - r.breakMinutes / 60) * 100) / 100)
          : null,
        completedApts: r.completedApts,
        notes:        r.notes,
        createdAt:    r.createdAt,
      })),
    });
  } catch (err) {
    console.error('[payroll/attendance GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch attendance', 500);
  }
}

// ─── POST /api/payroll/attendance ─────────────────────────────────────────────
// Upsert an attendance record (one per specialist per day).

export async function POST(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid', 400);

  const { specialistId, date, status, checkInAt, checkOutAt, breakMinutes, notes } = parsed.data;

  // Specialists can only record their own attendance
  if (role === 'SPECIALIST') {
    const spec = await prisma.specialist.findFirst({ where: { userId: userId ?? '', id: specialistId }, select: { id: true } });
    if (!spec) return apiError('FORBIDDEN', 'Cannot record attendance for another specialist', 403);
  }

  try {
    // Count completed appointments for this day to auto-populate completedApts
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd   = new Date(date + 'T23:59:59.999Z');
    const aptCount = await prisma.appointment.count({
      where: { specialistId, status: 'COMPLETED', checkedOutAt: { gte: dayStart, lte: dayEnd } },
    });

    const record = await prisma.attendanceRecord.upsert({
      where:  { specialistId_date: { specialistId, date: new Date(date) } },
      create: {
        specialistId,
        date:         new Date(date),
        status:       (status ?? 'PRESENT') as never,
        checkInAt:    checkInAt ? new Date(checkInAt) : null,
        checkOutAt:   checkOutAt ? new Date(checkOutAt) : null,
        breakMinutes: breakMinutes ?? 0,
        completedApts: aptCount,
        notes:        notes ?? null,
        recordedBy:   userId ?? null,
      },
      update: {
        ...(status      ? { status: status as never }              : {}),
        ...(checkInAt !== undefined  ? { checkInAt:  checkInAt  ? new Date(checkInAt)  : null } : {}),
        ...(checkOutAt !== undefined ? { checkOutAt: checkOutAt ? new Date(checkOutAt) : null } : {}),
        ...(breakMinutes !== undefined ? { breakMinutes } : {}),
        completedApts: aptCount,
        ...(notes !== undefined ? { notes } : {}),
      },
      select: { id: true, specialistId: true, date: true, status: true, checkInAt: true, checkOutAt: true, breakMinutes: true, completedApts: true },
    });

    return ok(record, 201);
  } catch (err) {
    console.error('[payroll/attendance POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to upsert attendance', 500);
  }
}
