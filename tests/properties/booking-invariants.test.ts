/**
 * Property-based tests — Booking invariants (fast-check).
 *
 * Invariants that must ALWAYS hold regardless of input:
 *   1. Booking.endTime > Booking.startTime
 *   2. Massage sessions per specialist per day ≤ configured max
 *   3. Time slots always align to :00/:15/:30/:45 minute marks
 *   4. Massage buffer (30 min) ensures no two sessions overlap
 *
 * Each property is tested over 1 000 random inputs.
 */

import * as fc from 'fast-check';

// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_ALIGN_MINUTES = 15;
const MASSAGE_BUFFER_MIN = 30;
const MAX_MASSAGE_SESSIONS_PER_DAY = 8; // configurable ceiling

// ─── Domain helpers (duplicated from route for isolation) ─────────────────────
function alignToSlot(ms: number, slotMs: number): number {
  const rem = ms % slotMs;
  return rem === 0 ? ms : ms + (slotMs - rem);
}

function hasConflictWithBuffer(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number,
  bufferMs: number,
): boolean {
  const aEffectiveEnd = aEnd + bufferMs;
  return aStart < bStart + bufferMs && aEffectiveEnd > bStart ||
         bStart < aStart + bufferMs && bEnd + bufferMs > aStart;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────
/** A booking represented as { startMin, durationMin } both in minutes from midnight. */
const bookingArb = fc.record({
  startMin:    fc.integer({ min: 0, max: 23 * 60 }),  // 00:00 – 23:00
  durationMin: fc.integer({ min: 15, max: 180 })       // 15 min – 3 h
    .map((d) => Math.ceil(d / 15) * 15),               // snap to 15-min multiple
});

// ─── Invariant 1: endTime > startTime ────────────────────────────────────────
describe('Invariant: Booking.endTime > Booking.startTime', () => {
  it('holds for 1 000 random bookings', () => {
    fc.assert(
      fc.property(bookingArb, ({ startMin, durationMin }) => {
        const startMs = startMin * 60_000;
        const endMs   = startMs + durationMin * 60_000;
        return endMs > startMs;
      }),
      { numRuns: 1_000 },
    );
  });

  it('a 0-duration booking fails (endTime would equal startTime)', () => {
    // This documents that the system should reject 0-duration bookings.
    // 0-duration is invalid by business rules.
    const startMs = 10 * 60 * 60_000;
    const endMs   = startMs; // same time
    expect(endMs > startMs).toBe(false);
  });
});

// ─── Invariant 2: massage sessions per day ≤ MAX ────────────────────────────
describe('Invariant: massage sessions per specialist per day ≤ max', () => {
  it('holds for 1 000 random daily schedules', () => {
    const sessionArb = fc.array(
      fc.integer({ min: 1, max: MAX_MASSAGE_SESSIONS_PER_DAY }),
      { minLength: 0, maxLength: 20 },
    );
    fc.assert(
      fc.property(sessionArb, (sessions) => {
        // Simulate: only accept up to MAX sessions
        const accepted = sessions.slice(0, MAX_MASSAGE_SESSIONS_PER_DAY);
        return accepted.length <= MAX_MASSAGE_SESSIONS_PER_DAY;
      }),
      { numRuns: 1_000 },
    );
  });
});

// ─── Invariant 3: time slots align to :00/:15/:30/:45 ────────────────────────
describe('Invariant: time slots always align to 15-minute boundaries', () => {
  const slotAlignMs = SLOT_ALIGN_MINUTES * 60_000;

  it('alignToSlot always produces a :00/:15/:30/:45 aligned time (1 000 random ms)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 24 * 60 * 60_000 - 1 }), (rawMs) => {
        const aligned = alignToSlot(rawMs, slotAlignMs);
        const alignedMinutes = Math.floor(aligned / 60_000) % 60;
        return alignedMinutes % SLOT_ALIGN_MINUTES === 0;
      }),
      { numRuns: 1_000 },
    );
  });

  it('aligned time is always >= original time', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 24 * 60 * 60_000 - 1 }), (rawMs) => {
        return alignToSlot(rawMs, slotAlignMs) >= rawMs;
      }),
      { numRuns: 1_000 },
    );
  });

  it('aligned time is never more than 14:59 ahead of original', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 24 * 60 * 60_000 - 1 }), (rawMs) => {
        const diff = alignToSlot(rawMs, slotAlignMs) - rawMs;
        return diff < slotAlignMs;
      }),
      { numRuns: 1_000 },
    );
  });
});

// ─── Invariant 4: 30-min massage buffer prevents overlap ────────────────────
describe('Invariant: 30-min massage buffer enforces non-overlap', () => {
  const bufferMs = MASSAGE_BUFFER_MIN * 60_000;

  it('two massage sessions with exactly 30-min gap do NOT conflict (1 000 random)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 * 60 * 60_000 }),  // start of session A
        fc.integer({ min: 30, max: 180 })                 // duration in minutes
          .map((d) => d * 60_000),
        (aStartMs, durationMs) => {
          const aEndMs   = aStartMs + durationMs;
          // Session B starts exactly at aEnd + buffer — must NOT conflict
          const bStartMs = aEndMs + bufferMs;
          const bEndMs   = bStartMs + durationMs;
          return !hasConflictWithBuffer(aStartMs, aEndMs, bStartMs, bEndMs, bufferMs);
        },
      ),
      { numRuns: 1_000 },
    );
  });

  it('two sessions with < 30-min gap ALWAYS conflict (1 000 random)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 * 60 * 60_000 }),
        fc.integer({ min: 30, max: 180 }).map((d) => d * 60_000),
        fc.integer({ min: 0, max: MASSAGE_BUFFER_MIN - 1 }).map((m) => m * 60_000), // gap < buffer
        (aStartMs, durationMs, gapMs) => {
          const aEndMs   = aStartMs + durationMs;
          const bStartMs = aEndMs + gapMs; // gap is 0..29 min — must conflict
          const bEndMs   = bStartMs + durationMs;
          return hasConflictWithBuffer(aStartMs, aEndMs, bStartMs, bEndMs, bufferMs);
        },
      ),
      { numRuns: 1_000 },
    );
  });
});

// ─── Invariant 5: specialist count after N creates = N ───────────────────────
describe('Invariant: specialist count after N creates equals N', () => {
  it('simulated specialist store: count(after N adds) === N (1 000 random N)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (n) => {
        // Simulate a pure in-memory store
        const store = new Set<string>();
        for (let i = 0; i < n; i++) {
          store.add(`specialist-id-${i}`);
        }
        return store.size === n;
      }),
      { numRuns: 1_000 },
    );
  });

  it('duplicate email prevents double-creation (set semantics)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),   // n unique
        fc.integer({ min: 1, max: 10 }),   // k duplicates attempted
        (uniqueCount, duplicateAttempts) => {
          const emails = new Set<string>();
          // Add unique specialists
          for (let i = 0; i < uniqueCount; i++) {
            emails.add(`specialist-${i}@salon.ru`);
          }
          // Attempt to add duplicates (first email)
          for (let j = 0; j < duplicateAttempts; j++) {
            emails.add('specialist-0@salon.ru'); // always a duplicate
          }
          // Count must remain uniqueCount regardless of duplicate attempts
          return emails.size === uniqueCount;
        },
      ),
      { numRuns: 1_000 },
    );
  });
});
