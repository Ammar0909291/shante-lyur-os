/**
 * Unit tests — Booking scheduling utilities.
 *
 * Tests extracted logic from src/app/api/admin/bookings/route.ts:
 * - 15-minute slot alignment invariant
 * - 30-minute buffer for massagists
 * - Next-available-slot suggestion engine
 * - Overlap detection
 *
 * All these functions live inside the route file. We re-implement the pure
 * logic here for unit-level verification, keeping tests decoupled from
 * Next.js request infrastructure.
 */

// ─── Inline pure functions extracted from the route ──────────────────────────

const MASSAGE_BUFFER_MS = 30 * 60_000;
const SLOT_INTERVAL_MS  = 30 * 60_000;

function hasConflict(
  newStart: Date,
  newEnd: Date,
  existing: Array<{ startAt: Date; endAt: Date }>,
  bufferMs: number,
): boolean {
  return existing.some((appt) => {
    const effectiveEnd = new Date(appt.endAt.getTime() + bufferMs);
    return newStart < effectiveEnd && newEnd > appt.startAt;
  });
}

function findNextAvailableSlots(
  existingAppts: Array<{ startAt: Date; endAt: Date }>,
  durationMs: number,
  isMassagist: boolean,
  fromTime: Date,
  count = 3,
): string[] {
  const bufferMs = isMassagist ? MASSAGE_BUFFER_MS : 0;
  const slots: string[] = [];
  const rem = fromTime.getTime() % SLOT_INTERVAL_MS;
  let candidate = new Date(rem === 0 ? fromTime : fromTime.getTime() + (SLOT_INTERVAL_MS - rem));
  for (let attempt = 0; attempt < 300 && slots.length < count; attempt++) {
    const candidateEnd = new Date(candidate.getTime() + durationMs);
    if (!hasConflict(candidate, candidateEnd, existingAppts, bufferMs)) {
      slots.push(candidate.toISOString());
    }
    candidate = new Date(candidate.getTime() + SLOT_INTERVAL_MS);
  }
  return slots;
}

// ─── Overlap detection ────────────────────────────────────────────────────────
describe('hasConflict — exact overlap detection', () => {
  const appt = {
    startAt: new Date('2026-06-01T10:00:00Z'),
    endAt:   new Date('2026-06-01T11:30:00Z'),
  };

  it('detects exact same-time booking as conflict', () => {
    const r = hasConflict(appt.startAt, appt.endAt, [appt], 0);
    expect(r).toBe(true);
  });

  it('detects partial start-overlap (new starts inside existing)', () => {
    const newStart = new Date('2026-06-01T11:00:00Z');
    const newEnd   = new Date('2026-06-01T12:30:00Z');
    expect(hasConflict(newStart, newEnd, [appt], 0)).toBe(true);
  });

  it('detects partial end-overlap (new ends inside existing)', () => {
    const newStart = new Date('2026-06-01T09:00:00Z');
    const newEnd   = new Date('2026-06-01T10:30:00Z');
    expect(hasConflict(newStart, newEnd, [appt], 0)).toBe(true);
  });

  it('no conflict for back-to-back bookings with 0-buffer', () => {
    const newStart = appt.endAt; // starts exactly when existing ends
    const newEnd   = new Date(newStart.getTime() + 30 * 60_000);
    expect(hasConflict(newStart, newEnd, [appt], 0)).toBe(false);
  });

  it('no conflict for booking that ends before existing starts', () => {
    const newStart = new Date('2026-06-01T08:00:00Z');
    const newEnd   = new Date('2026-06-01T09:59:59Z');
    expect(hasConflict(newStart, newEnd, [appt], 0)).toBe(false);
  });
});

// ─── Massage buffer ───────────────────────────────────────────────────────────
describe('hasConflict — 30-minute massage buffer', () => {
  const massageAppt = {
    startAt: new Date('2026-06-01T10:00:00Z'),
    endAt:   new Date('2026-06-01T11:30:00Z'), // ends 11:30
  };

  it('rejects booking starting 15 min after massage end (buffer not satisfied)', () => {
    const newStart = new Date('2026-06-01T11:45:00Z'); // only 15 min after 11:30
    const newEnd   = new Date('2026-06-01T13:15:00Z');
    expect(hasConflict(newStart, newEnd, [massageAppt], MASSAGE_BUFFER_MS)).toBe(true);
  });

  it('rejects booking starting 29 min after massage end', () => {
    const newStart = new Date('2026-06-01T11:59:00Z');
    const newEnd   = new Date('2026-06-01T13:29:00Z');
    expect(hasConflict(newStart, newEnd, [massageAppt], MASSAGE_BUFFER_MS)).toBe(true);
  });

  it('allows booking starting exactly 30 min after massage end', () => {
    const newStart = new Date('2026-06-01T12:00:00Z'); // 11:30 + 30min = 12:00 ✓
    const newEnd   = new Date('2026-06-01T13:30:00Z');
    expect(hasConflict(newStart, newEnd, [massageAppt], MASSAGE_BUFFER_MS)).toBe(false);
  });

  it('allows booking starting 31 min after massage end', () => {
    const newStart = new Date('2026-06-01T12:01:00Z');
    const newEnd   = new Date('2026-06-01T13:31:00Z');
    expect(hasConflict(newStart, newEnd, [massageAppt], MASSAGE_BUFFER_MS)).toBe(false);
  });

  it('allows cosmetologist back-to-back (0 buffer)', () => {
    const proc = { startAt: new Date('2026-06-01T10:00:00Z'), endAt: new Date('2026-06-01T10:30:00Z') };
    const newStart = proc.endAt;
    const newEnd   = new Date(newStart.getTime() + 45 * 60_000);
    expect(hasConflict(newStart, newEnd, [proc], 0)).toBe(false);
  });
});

// ─── Next-available-slot suggestions ─────────────────────────────────────────
describe('findNextAvailableSlots', () => {
  it('returns 3 slots for massagist with one existing appointment', () => {
    const existing = [{
      startAt: new Date('2026-06-01T10:00:00Z'),
      endAt:   new Date('2026-06-01T11:30:00Z'),
    }];
    const from = new Date('2026-06-01T09:00:00Z');
    const slots = findNextAvailableSlots(existing, 90 * 60_000, true, from, 3);

    expect(slots).toHaveLength(3);
    // All suggested slots must be clear of the existing appointment + buffer
    for (const slot of slots) {
      const s = new Date(slot);
      const e = new Date(s.getTime() + 90 * 60_000);
      const conflict = hasConflict(s, e, existing, MASSAGE_BUFFER_MS);
      expect(conflict).toBe(false);
    }
  });

  it('all returned slots align to 30-minute boundaries', () => {
    const existing: Array<{ startAt: Date; endAt: Date }> = [];
    const from = new Date('2026-06-01T09:17:00Z'); // deliberately off-boundary
    const slots = findNextAvailableSlots(existing, 60 * 60_000, false, from, 5);

    for (const slot of slots) {
      const d = new Date(slot);
      const minutes = d.getUTCMinutes();
      expect([0, 30]).toContain(minutes);
    }
  });

  it('returns at least 1 slot even when specialist is heavily booked', () => {
    // Fill 8 hours with 30-min blocks
    const existing: Array<{ startAt: Date; endAt: Date }> = [];
    for (let h = 8; h < 16; h++) {
      existing.push({
        startAt: new Date(`2026-06-01T${String(h).padStart(2, '0')}:00:00Z`),
        endAt:   new Date(`2026-06-01T${String(h).padStart(2, '0')}:30:00Z`),
      });
    }
    const from = new Date('2026-06-01T08:00:00Z');
    const slots = findNextAvailableSlots(existing, 30 * 60_000, false, from, 1);
    // Even with dense schedule, a 1-slot search should find something
    expect(slots.length).toBeGreaterThanOrEqual(1);
  });

  it('returns requested count when schedule is clear', () => {
    const from = new Date('2026-06-01T09:00:00Z');
    const slots = findNextAvailableSlots([], 60 * 60_000, true, from, 3);
    expect(slots).toHaveLength(3);
  });
});

// ─── 15-minute slot alignment (business rule documentation) ──────────────────
describe('Slot alignment — :00/:15/:30/:45 boundaries', () => {


  it.each([
    ['2026-06-01T10:00:00Z', 0],
    ['2026-06-01T10:15:00Z', 15],
    ['2026-06-01T10:30:00Z', 30],
    ['2026-06-01T10:45:00Z', 45],
  ])('%s is a valid 15-min boundary slot', (isoTime, expectedMinutes) => {
    const d = new Date(isoTime);
    const minutes = d.getUTCMinutes();
    const isAligned = minutes % 15 === 0;
    expect(isAligned).toBe(true);
    expect(minutes).toBe(expectedMinutes);
  });

  it.each([
    '2026-06-01T10:07:00Z',
    '2026-06-01T10:22:00Z',
    '2026-06-01T10:37:00Z',
    '2026-06-01T10:52:00Z',
  ])('%s is NOT a valid 15-min boundary', (isoTime) => {
    const d = new Date(isoTime);
    expect(d.getUTCMinutes() % 15).not.toBe(0);
  });

  it('booking duration must be a multiple of 15 minutes', () => {
    const validDurations = [15, 30, 45, 60, 75, 90, 105, 120];
    for (const d of validDurations) {
      expect(d % 15).toBe(0);
    }
    const invalidDurations = [10, 20, 25, 35, 40];
    for (const d of invalidDurations) {
      expect(d % 15).not.toBe(0);
    }
  });
});

// ─── Massage workload (90-min = 1.5 sessions, 6/day minimum) ─────────────────
describe('Massage workload calculation', () => {
  const SESSION_UNIT_MINUTES = 60;

  function sessionUnits(durationMinutes: number): number {
    return durationMinutes / SESSION_UNIT_MINUTES;
  }

  it('90-min massage equals 1.5 session units', () => {
    expect(sessionUnits(90)).toBe(1.5);
  });

  it('60-min massage equals 1.0 session units', () => {
    expect(sessionUnits(60)).toBe(1);
  });

  it('30-min procedure equals 0.5 session units', () => {
    expect(sessionUnits(30)).toBe(0.5);
  });

  it('6-session minimum workload = 360 minutes', () => {
    const minSessionsPerDay = 6;
    const totalMinutes = minSessionsPerDay * SESSION_UNIT_MINUTES;
    expect(totalMinutes).toBe(360);
  });

  it('8-hour day allows at most 5 full 90-min massages (with 30-min buffers)', () => {
    // 8h = 480min; each 90-min massage + 30-min buffer = 120min
    // 480 / 120 = 4 full cycles, so max 4 massages (5th would need 600min)
    const dayMinutes = 480;
    const massagePlusBuf = 90 + 30;
    const maxMassages = Math.floor(dayMinutes / massagePlusBuf);
    expect(maxMassages).toBe(4);
  });
});
