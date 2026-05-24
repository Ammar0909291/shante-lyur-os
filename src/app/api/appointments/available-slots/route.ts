export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// Statuses that actually occupy a specialist's time
const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULED'];

const MASSAGE_BUFFER_MINS = 30;

// Salon working hours in Yekaterinburg time (UTC+5)
const SALON_START_HOUR = 10; // 10:00 Yekaterinburg = 05:00 UTC
const SALON_END_HOUR   = 20; // 20:00 Yekaterinburg = 15:00 UTC

const QuerySchema = z.object({
  specialistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().positive().default(60),
  // admin can bypass massage buffer
  adminOverride: z.coerce.boolean().default(false),
});

// -----------------------------------------------------------
// Yekaterinburg ↔ UTC helpers
// All internal calculations in UTC.
// Yekaterinburg = UTC+5 (no DST).
// -----------------------------------------------------------

const YEKT_OFFSET_H = 5;

/** Yekaterinburg HH:MM → UTC Date on a given date string */
function localToUTC(date: string, hourLocal: number, min: number): Date {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCHours(hourLocal - YEKT_OFFSET_H, min, 0, 0);
  return d;
}

/** UTC Date → "HH:MM" in Yekaterinburg time */
function utcToLocalStr(d: Date): string {
  const ms = new Date(d.getTime() + YEKT_OFFSET_H * 3600_000);
  return `${String(ms.getUTCHours()).padStart(2, '0')}:${String(ms.getUTCMinutes()).padStart(2, '0')}`;
}

// -----------------------------------------------------------
// Slot generation
// -----------------------------------------------------------

/** Returns UTC Date objects for every 15-min slot in the salon's working day */
function buildDaySlots(date: string): Date[] {
  const slots: Date[] = [];
  for (let h = SALON_START_HOUR; h < SALON_END_HOUR; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(localToUTC(date, h, m));
    }
  }
  return slots;
}

type SlotResult = { time: string; available: boolean; reason: string | null };

function evaluateSlot(
  slotStart: Date,
  duration: number,
  dayEndUTC: Date,
  blockedRanges: Array<[number, number]>,
  now: number,
): SlotResult {
  const time    = utcToLocalStr(slotStart);
  const startMs = slotStart.getTime();
  const endMs   = startMs + duration * 60_000;

  // Must start at least 30 min in the future
  if (startMs < now + 30 * 60_000) {
    return { time, available: false, reason: 'past' };
  }

  // Session must finish by end of working day
  if (endMs > dayEndUTC.getTime()) {
    return { time, available: false, reason: 'outside_hours' };
  }

  // Check overlaps with blocked ranges
  for (const [bStart, bEnd] of blockedRanges) {
    if (startMs < bEnd && endMs > bStart) {
      return { time, available: false, reason: 'occupied' };
    }
  }

  return { time, available: true, reason: null };
}

// -----------------------------------------------------------
// Next-available-day lookup
// -----------------------------------------------------------

function findNextDay(
  fromDate: string,
  duration: number,
  existingSlots: SlotResult[],
): string | null {
  if (existingSlots.some(s => s.available)) return null;

  for (let i = 1; i <= 7; i++) {
    const d = new Date(`${fromDate}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    if (d.getUTCDay() === 0) continue; // skip Sundays
    const next = d.toISOString().slice(0, 10);
    // Quick estimate: if duration fits within working window, flag it
    if ((SALON_END_HOUR - SALON_START_HOUR) * 60 >= duration + MASSAGE_BUFFER_MINS) {
      return next;
    }
  }
  return null;
}

// -----------------------------------------------------------
// Route handler
// -----------------------------------------------------------

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  params.forEach((v, k) => { raw[k] = v; });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Missing or invalid query parameters', 400);
  }

  const { specialistId, date, duration } = parsed.data;

  // adminOverride is only honoured for ADMIN / SUPER_ADMIN roles
  const userRole = req.headers.get('x-user-role') ?? 'CLIENT';
  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
  const adminOverride = parsed.data.adminOverride && ADMIN_ROLES.includes(userRole);

  // day boundaries in UTC
  const dayStartUTC = localToUTC(date, SALON_START_HOUR, 0);
  const dayEndUTC   = localToUTC(date, SALON_END_HOUR,   0);
  const now         = Date.now();

  // ── Try real DB path ──────────────────────────────────────────────────────

  try {
    const { DIRegistry } = await import('@/infrastructure/config/di-registry');
    const registry = DIRegistry.instance;

    const specialist = await registry.specialistRepository.findById(specialistId);
    if (!specialist || !specialist.isActive) {
      return apiError('NOT_FOUND', 'Specialist not found', 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sp = specialist as any;
    const specText = String(sp.specialization ?? '').toLowerCase();
    const isMassage =
      sp.specialistType === 'MASSAGE_THERAPIST' ||
      specText.includes('massage') ||
      specText.includes('массаж') ||
      specText.includes('spa') ||
      specText.includes('спа') ||
      specText.includes('тело') ||
      specText.includes('антистресс');

    const applyBuffer = isMassage && !adminOverride;

    // Only active appointments block slots
    const existing: Array<{ startAt: Date; endAt: Date; status: string }> =
      await registry.appointmentRepository
        .findMany({ specialistId, from: dayStartUTC, to: dayEndUTC, limit: 200 })
        .then(r => r.items)
        .catch(() => []);

    const blockedRanges: Array<[number, number]> = existing
      .filter(a => ACTIVE_STATUSES.includes(a.status))
      .map(a => {
        const end = a.endAt.getTime();
        return [a.startAt.getTime(), applyBuffer ? end + MASSAGE_BUFFER_MINS * 60_000 : end] as [number, number];
      });

    const candidates = buildDaySlots(date);
    const slots = candidates.map(s => evaluateSlot(s, duration, dayEndUTC, blockedRanges, now));
    const nextAvailableDate = findNextDay(date, duration, slots);

    console.debug('[slots]', {
      date, specialistId: sp.id, isMassage, applyBuffer, adminOverride,
      totalSlots: slots.length,
      available: slots.filter(s => s.available).length,
      blocked: slots.filter(s => s.reason === 'occupied').length,
      past: slots.filter(s => s.reason === 'past').length,
    });

    return ok({
      date,
      specialistId,
      specialistName: sp.user?.name ?? '',
      isMassageTherapist: isMassage,
      massageBufferMinutes: applyBuffer ? MASSAGE_BUFFER_MINS : 0,
      adminOverride,
      slots,
      nextAvailableDate,
    });
  } catch (err) {
    console.debug('[slots] DB unavailable, using mock fallback:', (err as Error).message);
    return ok(getMockSlots(date, duration, adminOverride));
  }
}

// -----------------------------------------------------------
// Mock fallback (DB not available)
// Uses deterministic slot-time-based seed — NOT timestamp % 10
// -----------------------------------------------------------

function getMockSlots(date: string, duration: number, adminOverride: boolean) {
  const now      = Date.now();
  const dayEnd   = localToUTC(date, SALON_END_HOUR, 0);

  // Simulate ~3 existing bookings distributed through the day
  const mockBlocked: Array<[number, number]> = [
    // 11:00–12:00 Yekaterinburg booking (+ 30 min buffer if massage)
    [localToUTC(date, 11, 0).getTime(), localToUTC(date, 12, 30).getTime()],
    // 14:00–15:30 Yekaterinburg booking
    [localToUTC(date, 14, 0).getTime(), localToUTC(date, 15, 30).getTime()],
  ];

  const slots: SlotResult[] = buildDaySlots(date).map(slotStart => {
    const time    = utcToLocalStr(slotStart);
    const startMs = slotStart.getTime();
    const endMs   = startMs + duration * 60_000;

    if (startMs < now + 30 * 60_000) {
      return { time, available: false, reason: 'past' };
    }
    if (endMs > dayEnd.getTime()) {
      return { time, available: false, reason: 'outside_hours' };
    }

    // Only block with mock schedule if not admin override
    if (!adminOverride) {
      for (const [bStart, bEnd] of mockBlocked) {
        if (startMs < bEnd && endMs > bStart) {
          return { time, available: false, reason: 'occupied' };
        }
      }
    }

    return { time, available: true, reason: null };
  });

  return {
    date,
    specialistId: '',
    specialistName: '',
    isMassageTherapist: false,
    massageBufferMinutes: 0,
    adminOverride,
    slots,
    nextAvailableDate: findNextDay(date, duration, slots),
  };
}
