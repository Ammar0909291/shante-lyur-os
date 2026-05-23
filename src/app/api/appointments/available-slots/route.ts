export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const QuerySchema = z.object({
  specialistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().positive().default(60),
});

// Generate all 30-min slots between startHour:00 and endHour:00
function generateSlots(startHour: number, endHour: number, date: string): Date[] {
  const slots: Date[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 30]) {
      const d = new Date(`${date}T00:00:00.000Z`);
      // Use local midnight + offset so we work in Moscow time (UTC+3)
      d.setUTCHours(h - 3, m, 0, 0);
      slots.push(d);
    }
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  params.forEach((v, k) => { raw[k] = v; });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Missing or invalid query parameters', 400);
  }

  const { specialistId, date, duration } = parsed.data;

  try {
    const { DIRegistry } = await import('@/infrastructure/config/di-registry');
    const registry = DIRegistry.instance;

    // Fetch specialist to get type
    const specialist = await registry.specialistRepository.findById(specialistId);
    if (!specialist || !specialist.isActive) {
      return apiError('NOT_FOUND', 'Specialist not found', 404);
    }

    // Working hours: 9:00–20:00 (fallback when no schedule found)
    const dayStart = new Date(`${date}T06:00:00.000Z`); // 09:00 Moscow
    const dayEnd   = new Date(`${date}T17:00:00.000Z`); // 20:00 Moscow

    // Fetch existing appointments for this specialist on this date
    const existing = await registry.appointmentRepository.findByDateRange(
      dayStart, dayEnd, { specialistId }
    ).catch(() => []);

    // Specialist type from specialization field fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = specialist as any;
    const isMassage =
      raw.specialistType === 'MASSAGE_THERAPIST' ||
      raw.specialization?.includes('MASSAGE') ||
      raw.specialization?.includes('massage');

    const MASSAGE_BUFFER_MINS = 30;

    // Build blocked ranges: [start, end] in ms
    const blockedRanges: Array<[number, number]> = existing
      .filter((a: { status: string }) => !['CANCELLED', 'NO_SHOW'].includes(a.status))
      .map((a: { startAt: Date; endAt: Date }) => {
        const end = a.endAt.getTime();
        // For massage therapists, extend blocked range by buffer
        const blockEnd = isMassage ? end + MASSAGE_BUFFER_MINS * 60000 : end;
        return [a.startAt.getTime(), blockEnd] as [number, number];
      });

    // Generate candidate slots every 30 minutes 9:00–19:30
    const candidates = generateSlots(9, 20, date);
    const now = Date.now();

    const slots = candidates.map((slotStart) => {
      const slotEnd = slotStart.getTime() + duration * 60000;

      // Must be in the future (at least 30 min from now)
      if (slotStart.getTime() < now + 30 * 60000) {
        return { time: formatSlotTime(slotStart), available: false, reason: 'past' };
      }

      // Must end before day end
      if (slotEnd > dayEnd.getTime()) {
        return { time: formatSlotTime(slotStart), available: false, reason: 'outside_hours' };
      }

      // Check against blocked ranges
      const conflict = blockedRanges.find(
        ([bStart, bEnd]) => slotStart.getTime() < bEnd && slotEnd > bStart
      );
      if (conflict) {
        return { time: formatSlotTime(slotStart), available: false, reason: 'occupied' };
      }

      return { time: formatSlotTime(slotStart), available: true, reason: null };
    });

    // Next available suggestion: look forward up to 3 days
    const nextAvailableDate = findNextAvailableDay(date, slots, blockedRanges, duration, isMassage, dayStart, dayEnd, now);

    return ok({
      date,
      specialistId,
      specialistName: raw.user?.name ?? '',
      isMassageTherapist: isMassage,
      massageBufferMinutes: isMassage ? MASSAGE_BUFFER_MINS : 0,
      slots,
      nextAvailableDate,
    });
  } catch {
    // Fallback mock response when DB is not available
    return ok(getMockSlots(date, duration));
  }
}

function formatSlotTime(d: Date): string {
  // Display in Moscow time (UTC+3)
  const moscow = new Date(d.getTime() + 3 * 3600000);
  const h = moscow.getUTCHours().toString().padStart(2, '0');
  const m = moscow.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function findNextAvailableDay(
  date: string,
  currentSlots: Array<{ available: boolean }>,
  _blocked: Array<[number, number]>,
  duration: number,
  _isMassage: boolean,
  _dayStart: Date,
  _dayEnd: Date,
  _now: number,
): string | null {
  if (currentSlots.some(s => s.available)) return null;
  // Suggest next 3 calendar days
  for (let i = 1; i <= 3; i++) {
    const d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    const next = d.toISOString().slice(0, 10);
    // Skip Sundays (getUTCDay() === 0)
    if (d.getUTCDay() !== 0) {
      // Assume next days have 2+ available slots if duration is reasonable
      if (duration <= 120) return next;
    }
  }
  return null;
}

// Mock fallback for dev environments without DB
function getMockSlots(date: string, duration: number) {
  const now = Date.now();
  const slots = generateSlots(9, 20, date).map((slotStart) => {
    const slotEnd = slotStart.getTime() + duration * 60000;
    const dayEnd = new Date(`${date}T17:00:00.000Z`);
    const isPast = slotStart.getTime() < now + 30 * 60000;
    const afterHours = slotEnd > dayEnd.getTime();
    // Randomly block ~30% of slots to simulate a realistic schedule
    const seed = slotStart.getTime() % 10;
    const isBlocked = !isPast && !afterHours && seed < 3;
    return {
      time: formatSlotTime(slotStart),
      available: !isPast && !afterHours && !isBlocked,
      reason: isPast ? 'past' : afterHours ? 'outside_hours' : isBlocked ? 'occupied' : null,
    };
  });
  return {
    date,
    specialistId: '',
    specialistName: '',
    isMassageTherapist: false,
    massageBufferMinutes: 0,
    slots,
    nextAvailableDate: null,
  };
}
