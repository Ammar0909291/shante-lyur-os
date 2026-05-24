export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { DayOfWeek } from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

/** Convert a UTC Date to a YYYY-MM-DD string in Moscow time (UTC+3). */
function toMoscowDateStr(date: Date): string {
  const moscowMs = date.getTime() + 3 * 60 * 60 * 1000;
  const d = new Date(moscowMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

/** Convert an HH:MM Moscow time string + YYYY-MM-DD string to a UTC Date. */
function scheduleTimeToUtc(dateStr: string, timeHHMM: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeHHMM.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 3, mm, 0));
}

/** Get day-of-week in Moscow for a given UTC Date. */
function moscowDayOfWeek(date: Date): DayOfWeek {
  const DOW: DayOfWeek[] = [
    'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
  ];
  const moscowMs = date.getTime() + 3 * 60 * 60 * 1000;
  const d = new Date(moscowMs);
  return DOW[d.getUTCDay()];
}

const SKIPPED_STATUSES = ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'] as const;

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const params = req.nextUrl.searchParams;
    const serviceId = params.get('serviceId');
    const startAtStr = params.get('startAt');
    const endAtStr = params.get('endAt');

    if (!serviceId) return apiError('VALIDATION_ERROR', 'serviceId is required', 400);
    if (!startAtStr) return apiError('VALIDATION_ERROR', 'startAt is required', 400);
    if (!endAtStr) return apiError('VALIDATION_ERROR', 'endAt is required', 400);

    const startAt = new Date(startAtStr);
    const endAt = new Date(endAtStr);

    if (isNaN(startAt.getTime())) return apiError('VALIDATION_ERROR', 'startAt is not a valid ISO datetime', 400);
    if (isNaN(endAt.getTime())) return apiError('VALIDATION_ERROR', 'endAt is not a valid ISO datetime', 400);
    if (endAt <= startAt) return apiError('VALIDATION_ERROR', 'endAt must be after startAt', 400);

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });
    if (!service) return apiError('NOT_FOUND', 'Service not found', 404);

    const dayOfWeek = moscowDayOfWeek(startAt);
    const dateStr = toMoscowDateStr(startAt);

    // 1. Get all active specialists with their qualification info
    const allSpecialists = await prisma.specialist.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        color: true,
        specialization: true,
        user: { select: { firstName: true, lastName: true } },
        services: {
          where: { serviceId, isActive: true },
          select: { id: true },
        },
        workingSchedules: {
          where: {
            dayOfWeek,
            isActive: true,
            validFrom: { lte: endAt },
            OR: [{ validUntil: null }, { validUntil: { gte: startAt } }],
          },
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    const qualifiedIds = new Set(
      allSpecialists
        .filter((s) => s.services.length > 0)
        .map((s) => s.id),
    );

    // 2. For qualified specialists, check conflicting appointments
    const qualifiedSpecialistIds = [...qualifiedIds];
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        specialistId: { in: qualifiedSpecialistIds },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        status: { notIn: [...SKIPPED_STATUSES] },
      },
      select: { specialistId: true },
    });

    const bookedIds = new Set(conflictingAppointments.map((a) => a.specialistId));

    // 3. Build response
    const available: Array<{ id: string; name: string; color: string | null; specialization: string | null }> = [];
    const unavailable: Array<{ id: string; name: string; color: string | null; reason: 'BOOKED' | 'NOT_QUALIFIED' | 'OFF_SCHEDULE' }> = [];

    for (const spec of allSpecialists) {
      const name = `${spec.user.firstName} ${spec.user.lastName}`;
      const isQualified = qualifiedIds.has(spec.id);

      if (!isQualified) {
        unavailable.push({ id: spec.id, name, color: spec.color, reason: 'NOT_QUALIFIED' });
        continue;
      }

      // Check working schedule covers the slot
      const hasSchedule = spec.workingSchedules.some((ws) => {
        const wsStart = scheduleTimeToUtc(dateStr, ws.startTime);
        const wsEnd = scheduleTimeToUtc(dateStr, ws.endTime);
        return wsStart <= startAt && wsEnd >= endAt;
      });

      if (!hasSchedule) {
        unavailable.push({ id: spec.id, name, color: spec.color, reason: 'OFF_SCHEDULE' });
        continue;
      }

      if (bookedIds.has(spec.id)) {
        unavailable.push({ id: spec.id, name, color: spec.color, reason: 'BOOKED' });
        continue;
      }

      available.push({
        id: spec.id,
        name,
        color: spec.color,
        specialization: spec.specialization,
      });
    }

    return ok({ available, unavailable });
  } catch (error) {
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
