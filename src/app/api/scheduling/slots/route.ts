export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ServiceCategory, DayOfWeek } from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

/** Yekaterinburg day-of-week string for a YYYY-MM-DD date string.
 *  We parse at noon UTC to avoid any daylight-saving edge cases. */
function getDayOfWeek(dateStr: string): DayOfWeek {
  const DOW: DayOfWeek[] = [
    'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
  ];
  const d = new Date(dateStr + 'T12:00:00Z');
  return DOW[d.getUTCDay()];
}

const YEKT_OFFSET_H = 5; // Yekaterinburg = UTC+5, no DST

/** Convert an HH:MM Yekaterinburg time string + date string to a UTC Date. */
function scheduleTimeToUtc(dateStr: string, timeHHMM: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeHHMM.split(':').map(Number);
  // Yekaterinburg is UTC+5, so UTC = local - 5 hours
  return new Date(Date.UTC(y, m - 1, d, hh - YEKT_OFFSET_H, mm, 0));
}

/** Returns [startOfDayUtc, endOfDayUtc] for a Yekaterinburg calendar day. */
function dayBoundsUtc(dateStr: string): { startUtc: Date; endUtc: Date } {
  const [y, m, d] = dateStr.split('-').map(Number);
  // 00:00 YEKT = 19:00 UTC of the previous calendar day
  const startUtc = new Date(Date.UTC(y, m - 1, d, -YEKT_OFFSET_H, 0, 0));
  // 24:00 YEKT = 19:00 UTC of the same calendar day
  const endUtc = new Date(Date.UTC(y, m - 1, d, 24 - YEKT_OFFSET_H, 0, 0));
  return { startUtc, endUtc };
}

/** Returns today's date in Yekaterinburg timezone as YYYY-MM-DD. */
function localTodayStr(): string {
  const now = new Date();
  const localMs = now.getTime() + YEKT_OFFSET_H * 60 * 60 * 1000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

const SKIPPED_STATUSES = ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotResult {
  startAt: string;
  endAt: string;
  specialist: { id: string; name: string; color: string | null };
  room: { id: string; name: string } | null;
  score: number;
}

interface SpecialistSummary {
  id: string;
  name: string;
  color: string | null;
  isQualified: boolean;
  availableSlotCount: number;
  currentLoad: number;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // Auth check: require x-user-id header
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const params = req.nextUrl.searchParams;
    const serviceId = params.get('serviceId');
    const dateParam = params.get('date');
    const specialistIdParam = params.get('specialistId');
    const locationIdParam = params.get('locationId');

    if (!serviceId) {
      return apiError('VALIDATION_ERROR', 'serviceId is required', 400);
    }

    // Validate date format if provided
    const dateStr = dateParam ?? localTodayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return apiError('VALIDATION_ERROR', 'date must be YYYY-MM-DD', 400);
    }

    // 1. Fetch the service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, baseDuration: true, category: true },
    });
    if (!service) {
      return apiError('NOT_FOUND', 'Service not found', 404);
    }

    const isMassage = service.category === ServiceCategory.MASSAGE;
    const baseDuration = service.baseDuration; // minutes
    const effectiveDuration = isMassage ? baseDuration + 30 : baseDuration;

    // 2. Find qualified specialists
    const specialistServiceLinks = await prisma.specialistService.findMany({
      where: {
        serviceId,
        isActive: true,
        specialist: {
          status: 'ACTIVE',
          ...(specialistIdParam ? { id: specialistIdParam } : {}),
        },
      },
      select: {
        specialistId: true,
        specialist: {
          select: {
            id: true,
            color: true,
            specialization: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Also fetch ALL active specialists for the specialists summary (qualified flag)
    const allActiveSpecialists = await prisma.specialist.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        color: true,
        specialization: true,
        user: { select: { firstName: true, lastName: true } },
        services: { where: { serviceId, isActive: true }, select: { id: true } },
      },
    });

    const qualifiedIds = new Set(specialistServiceLinks.map((l) => l.specialistId));

    const dayOfWeek = getDayOfWeek(dateStr);
    const { startUtc: dayStart, endUtc: dayEnd } = dayBoundsUtc(dateStr);

    // For the location filter applied to working schedules
    const locationFilter = locationIdParam ? { locationId: locationIdParam } : {};

    // 3. Fetch working schedules for the day (for qualified specialists)
    const qualifiedSpecialistIds = specialistServiceLinks.map((l) => l.specialistId);
    const workingSchedules = await prisma.workingSchedule.findMany({
      where: {
        specialistId: { in: qualifiedSpecialistIds },
        dayOfWeek,
        isActive: true,
        ...locationFilter,
        validFrom: { lte: new Date(dateStr + 'T21:00:00Z') }, // validFrom <= end of day MSK
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date(dateStr + 'T00:00:00Z') } },
        ],
      },
      select: {
        specialistId: true,
        locationId: true,
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
      },
    });

    // Group schedules by specialistId (take first active one per specialist)
    const scheduleBySpecialist = new Map<string, typeof workingSchedules[0]>();
    for (const ws of workingSchedules) {
      if (!scheduleBySpecialist.has(ws.specialistId)) {
        scheduleBySpecialist.set(ws.specialistId, ws);
      }
    }

    // 4. Fetch existing appointments for this day (for each qualified specialist)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        specialistId: { in: qualifiedSpecialistIds },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: { notIn: [...SKIPPED_STATUSES] },
      },
      select: {
        specialistId: true,
        startAt: true,
        endAt: true,
        services: {
          select: {
            service: { select: { category: true } },
          },
        },
      },
    });

    // 5. Fetch blocked times overlapping this day
    const blockedTimes = await prisma.blockedTime.findMany({
      where: {
        specialistId: { in: qualifiedSpecialistIds },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: {
        specialistId: true,
        startAt: true,
        endAt: true,
      },
    });

    // Group by specialistId
    const apptsBySpecialist = new Map<string, typeof existingAppointments>();
    const blockedBySpecialist = new Map<string, typeof blockedTimes>();

    for (const appt of existingAppointments) {
      const existing = apptsBySpecialist.get(appt.specialistId) ?? [];
      existing.push(appt);
      apptsBySpecialist.set(appt.specialistId, existing);
    }
    for (const bt of blockedTimes) {
      const existing = blockedBySpecialist.get(bt.specialistId) ?? [];
      existing.push(bt);
      blockedBySpecialist.set(bt.specialistId, existing);
    }

    // 6. Generate candidate slots for each qualified specialist
    const SLOT_INTERVAL_MINUTES = 15;
    const allSlots: SlotResult[] = [];
    const specialistSummaries: SpecialistSummary[] = [];

    for (const link of specialistServiceLinks) {
      const spec = link.specialist;
      const schedule = scheduleBySpecialist.get(spec.id);
      const specName = `${spec.user.firstName} ${spec.user.lastName}`;

      const appts = apptsBySpecialist.get(spec.id) ?? [];
      const currentLoad = appts.length;

      if (!schedule) {
        // Specialist not working that day
        specialistSummaries.push({
          id: spec.id,
          name: specName,
          color: spec.color,
          isQualified: true,
          availableSlotCount: 0,
          currentLoad,
        });
        continue;
      }

      const workStart = scheduleTimeToUtc(dateStr, schedule.startTime);
      const workEnd = scheduleTimeToUtc(dateStr, schedule.endTime);
      const breakStart = schedule.breakStart
        ? scheduleTimeToUtc(dateStr, schedule.breakStart)
        : null;
      const breakEnd = schedule.breakEnd
        ? scheduleTimeToUtc(dateStr, schedule.breakEnd)
        : null;

      const blocked = blockedBySpecialist.get(spec.id) ?? [];

      // Build busy intervals: existing appointments + massage buffers
      interface Interval { start: Date; end: Date }
      const busyIntervals: Interval[] = [];

      for (const appt of appts) {
        const apptStart = new Date(appt.startAt);
        const apptEnd = new Date(appt.endAt);
        const apptIsMassage = appt.services.some(
          (s) => s.service.category === ServiceCategory.MASSAGE,
        );

        if (isMassage || apptIsMassage) {
          // Apply 30-min buffer around massage appointments
          const bufferedStart = new Date(apptStart.getTime() - 30 * 60 * 1000);
          const bufferedEnd = new Date(apptEnd.getTime() + 30 * 60 * 1000);
          busyIntervals.push({ start: bufferedStart, end: bufferedEnd });
        } else {
          busyIntervals.push({ start: apptStart, end: apptEnd });
        }
      }

      // Add blocked times
      for (const bt of blocked) {
        busyIntervals.push({ start: new Date(bt.startAt), end: new Date(bt.endAt) });
      }

      // Generate candidate slots every 15 minutes
      const workStartMs = workStart.getTime();
      const workEndMs = workEnd.getTime();
      const effectiveMs = effectiveDuration * 60 * 1000;
      const baseMs = baseDuration * 60 * 1000;
      const intervalMs = SLOT_INTERVAL_MINUTES * 60 * 1000;
      const minutesFromWorkStart = (t: Date) =>
        (t.getTime() - workStartMs) / 60000;

      const specSlots: SlotResult[] = [];

      for (
        let candidateMs = workStartMs;
        candidateMs + effectiveMs <= workEndMs;
        candidateMs += intervalMs
      ) {
        const slotStart = new Date(candidateMs);
        const slotEnd = new Date(candidateMs + baseMs); // appointment end (not padded)
        const paddedEnd = new Date(candidateMs + effectiveMs); // includes buffer

        // Check break overlap [slotStart, paddedEnd]
        if (breakStart && breakEnd) {
          if (
            slotStart < breakEnd &&
            paddedEnd > breakStart
          ) {
            continue;
          }
        }

        // Check busy interval overlap [slotStart, paddedEnd]
        let isBusy = false;
        for (const busy of busyIntervals) {
          if (slotStart < busy.end && paddedEnd > busy.start) {
            isBusy = true;
            break;
          }
        }
        if (isBusy) continue;

        // Score: prefer earlier slots (closer to work start = higher score)
        const minutesFromStart = minutesFromWorkStart(slotStart);
        const score = Math.max(0, Math.min(100, Math.round(100 - minutesFromStart * 0.5)));

        specSlots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          specialist: { id: spec.id, name: specName, color: spec.color },
          room: null, // Room assignment is handled at booking time
          score,
        });
      }

      allSlots.push(...specSlots);

      specialistSummaries.push({
        id: spec.id,
        name: specName,
        color: spec.color,
        isQualified: true,
        availableSlotCount: specSlots.length,
        currentLoad,
      });
    }

    // Add non-qualified specialists to the summary
    for (const spec of allActiveSpecialists) {
      if (!qualifiedIds.has(spec.id)) {
        // Skip if filtered to specific specialist
        if (specialistIdParam && spec.id !== specialistIdParam) continue;
        specialistSummaries.push({
          id: spec.id,
          name: `${spec.user.firstName} ${spec.user.lastName}`,
          color: spec.color,
          isQualified: false,
          availableSlotCount: 0,
          currentLoad: 0,
        });
      }
    }

    // 7. Sort all slots: by startAt then score DESC
    allSlots.sort((a, b) => {
      const timeDiff = a.startAt.localeCompare(b.startAt);
      if (timeDiff !== 0) return timeDiff;
      return b.score - a.score;
    });

    // 8. Deduplicate by startAt: keep highest-score slot per start time
    const deduped: SlotResult[] = [];
    const seenTimes = new Set<string>();
    for (const slot of allSlots) {
      if (!seenTimes.has(slot.startAt)) {
        seenTimes.add(slot.startAt);
        deduped.push(slot);
      }
    }

    // 9. Return max 30 slots
    const slots = deduped.slice(0, 30);

    return ok({
      service: {
        id: service.id,
        name: service.name,
        duration: service.baseDuration,
        isMassage,
      },
      date: dateStr,
      slots,
      specialists: specialistSummaries,
    });
  } catch (error) {
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
