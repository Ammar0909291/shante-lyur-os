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

// Salon working hours in Moscow time (UTC+3)
const SALON_START_HOUR = 10; // 10:00 Moscow = 07:00 UTC
const SALON_END_HOUR   = 20; // 20:00 Moscow = 17:00 UTC

const QuerySchema = z.object({
  specialistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().positive().default(60),
  // admin can bypass massage buffer
  adminOverride: z.coerce.boolean().default(false),
});

// -----------------------------------------------------------
// Moscow ↔ UTC helpers
// All internal calculations in UTC.
// Moscow = UTC+3 (no DST).
// -----------------------------------------------------------

/** Moscow HH:MM → UTC Date on a given date string */
function moscowToUTC(date: string, hourMoscow: number, min: number): Date {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCHours(hourMoscow - 3, min, 0, 0);
  return d;
}

/** UTC Date → "HH:MM" in Moscow time */
function utcToMoscowStr(d: Date): string {
  const ms = new Date(d.getTime() + 3 * 3600_000);
  return `${String(ms.getUTCHours()).padStart(2, '0')}:${String(ms.getUTCMinutes()).padStart(2, '0')}`;
}

// -----------------------------------------------------------
// Slot generation
// -----------------------------------------------------------

/** Returns UTC Date objects for every 30-min slot in the salon's working day */
function buildDaySlots(date: string): Date[] {
  const slots: Date[] = [];
  for (let h = SALON_START_HOUR; h < SALON_END_HOUR; h++) {
    for (const m of [0, 30]) {
      slots.push(moscowToUTC(date, h, m));
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
  const time    = utcToMoscowStr(slotStart);
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
  const dayStartUTC = moscowToUTC(date, SALON_START_HOUR, 0);
  const dayEndUTC   = moscowToUTC(date, SALON_END_HOUR,   0);
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
    const isMassage =
      sp.specialistType === 'MASSAGE_THERAPIST' ||
      String(sp.specialization ?? '').toUpperCase().includes('MASSAGE');

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
  const dayEnd   = moscowToUTC(date, SALON_END_HOUR, 0);

  // Simulate ~3 existing bookings distributed through the day
  const mockBlocked: Array<[number, number]> = [
    // 11:00–12:00 Moscow booking (+ 30 min buffer if massage)
    [moscowToUTC(date, 11, 0).getTime(), moscowToUTC(date, 12, 30).getTime()],
    // 14:00–15:30 Moscow booking
    [moscowToUTC(date, 14, 0).getTime(), moscowToUTC(date, 15, 30).getTime()],
  ];

  const slots: SlotResult[] = buildDaySlots(date).map(slotStart => {
    const time    = utcToMoscowStr(slotStart);
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
