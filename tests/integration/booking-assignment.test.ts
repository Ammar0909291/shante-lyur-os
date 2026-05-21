/**
 * Integration tests — Booking assignment and scheduling validation.
 * Covers: category matching, massage buffer, admin override, next-slot suggestions.
 */

import { NextRequest } from 'next/server';
import { POST as createBooking } from '@/app/api/admin/bookings/route';
import { randomUUID } from 'crypto';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockSpecialistFindUnique   = jest.fn();
const mockAppointmentFindMany    = jest.fn();
const mockAppointmentCreate      = jest.fn();
const mockServiceFindMany        = jest.fn();
const mockCustomerProfileUpsert  = jest.fn();
const mockCustomerProfileUpdate  = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    specialist: {
      findUnique: (...a: unknown[]) => mockSpecialistFindUnique(...a),
    },
    appointment: {
      findMany: (...a: unknown[]) => mockAppointmentFindMany(...a),
      create:   (...a: unknown[]) => mockAppointmentCreate(...a),
    },
    service: {
      findMany: (...a: unknown[]) => mockServiceFindMany(...a),
    },
    customerProfile: {
      upsert: (...a: unknown[]) => mockCustomerProfileUpsert(...a),
      update: (...a: unknown[]) => mockCustomerProfileUpdate(...a),
    },
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const LOCATION_ID = '00000000-0000-0000-0000-000000000001';
const CLIENT_ID   = randomUUID();
const SERVICE_ID  = randomUUID();

function massagistSpecialist() {
  return { specialization: 'Массажист SPA' }; // findUnique select: { specialization: true }
}

function cosmetologistSpecialist() {
  return { specialization: 'Косметолог-эстетист' };
}

function makeAppointmentCreateResult(specialistId: string, newStart: Date, durationMin: number) {
  const newEnd = new Date(newStart.getTime() + durationMin * 60_000);
  return {
    id: randomUUID(),
    startAt: newStart,
    endAt: newEnd,
    totalPrice: 7000,
    totalDuration: durationMin,
    status: 'CONFIRMED',
    clientId: CLIENT_ID,
    specialistId,
    locationId: LOCATION_ID,
    notes: null,
    source: 'admin',
    soldByUserId: null,
    createdAt: new Date(),
    client: { firstName: 'Анна', lastName: 'Тестова', email: 'anna@test.ru' },
    specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
    services: [{ serviceId: SERVICE_ID, service: { name: 'SPA-массаж' }, price: 7000, duration: durationMin }],
    location: { name: 'Shante Lyur' },
  };
}

function bookingBody(specialistId: string, startAt: Date, durationMin = 90, overrides: Record<string, unknown> = {}) {
  return {
    clientId: CLIENT_ID,
    specialistId,
    locationId: LOCATION_ID,
    startAt: startAt.toISOString(),
    services: [{
      serviceId: SERVICE_ID,
      price: 7000,
      duration: durationMin,
      sortOrder: 0,
    }],
    source: 'admin',
    ...overrides,
  };
}

function postReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

// ─── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  // customerProfile upsert is always non-fatal — mock as no-op
  mockCustomerProfileUpsert.mockResolvedValue({ firstVisitAt: null });
  mockCustomerProfileUpdate.mockResolvedValue({});
});

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe('Booking: massage buffer enforcement (30 min)', () => {
  it('rejects a massage booking that starts within 30 min of an existing massage ending', async () => {
    const specId = randomUUID();
    const existingStart = new Date('2026-06-01T10:00:00.000Z');
    const existingEnd   = new Date('2026-06-01T11:30:00.000Z'); // 90-min massage ends at 11:30
    const newStart      = new Date('2026-06-01T11:45:00.000Z'); // only 15 min after existingEnd (< 30-min buffer)

    mockSpecialistFindUnique.mockResolvedValue(massagistSpecialist());
    mockServiceFindMany.mockResolvedValue([{ id: SERVICE_ID, category: 'MASSAGE' }]);
    // First findMany: conflict detection window
    mockAppointmentFindMany.mockResolvedValueOnce([
      { id: randomUUID(), startAt: existingStart, endAt: existingEnd },
    ]);
    // Second findMany: future appointments for slot suggestions
    mockAppointmentFindMany.mockResolvedValueOnce([
      { startAt: existingStart, endAt: existingEnd },
    ]);

    const res = await createBooking(postReq(bookingBody(specId, newStart)));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    // Route returns 'CONFLICT' (not 'SCHEDULING_CONFLICT')
    expect(json.error.code).toBe('CONFLICT');
    // Must suggest next available slots
    expect(Array.isArray(json.error.details?.nextAvailableSlots)).toBe(true);
    expect(json.error.details?.nextAvailableSlots.length).toBeGreaterThan(0);
    expect(json.error.details?.isMassagist).toBe(true);
    expect(json.error.details?.bufferMinutes).toBe(30);
  });

  it('allows a massage booking that starts exactly 30 min after existing massage ends', async () => {
    const specId = randomUUID();
    const existingStart = new Date('2026-06-01T10:00:00.000Z');
    const existingEnd   = new Date('2026-06-01T11:30:00.000Z');
    const newStart      = new Date('2026-06-01T12:00:00.000Z'); // 11:30 + 30 min = 12:00 ✓

    mockSpecialistFindUnique.mockResolvedValue(massagistSpecialist());
    mockServiceFindMany.mockResolvedValue([{ id: SERVICE_ID, category: 'MASSAGE' }]);
    mockAppointmentFindMany.mockResolvedValue([
      { id: randomUUID(), startAt: existingStart, endAt: existingEnd },
    ]);
    mockAppointmentCreate.mockResolvedValue(makeAppointmentCreateResult(specId, newStart, 90));

    const res = await createBooking(postReq(bookingBody(specId, newStart)));
    expect([200, 201]).toContain(res.status);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('does NOT enforce 30-min buffer for cosmetologists', async () => {
    const specId = randomUUID();
    const existingStart = new Date('2026-06-01T10:00:00.000Z');
    const existingEnd   = new Date('2026-06-01T10:30:00.000Z');
    const newStart      = new Date('2026-06-01T10:30:00.000Z'); // back-to-back — fine for cosmetologist

    mockSpecialistFindUnique.mockResolvedValue(cosmetologistSpecialist());
    mockServiceFindMany.mockResolvedValue([{ id: SERVICE_ID, category: 'COSMETOLOGY' }]);
    mockAppointmentFindMany.mockResolvedValue([
      { id: randomUUID(), startAt: existingStart, endAt: existingEnd },
    ]);
    mockAppointmentCreate.mockResolvedValue(makeAppointmentCreateResult(specId, newStart, 45));

    const res = await createBooking(postReq(bookingBody(specId, newStart, 45)));
    expect([200, 201]).toContain(res.status);
  });
});

describe('Booking: admin override', () => {
  it('allows overlap when ADMIN sends allowOverlap: true', async () => {
    const specId = randomUUID();
    const conflictStart = new Date('2026-06-01T10:00:00.000Z');
    const conflictEnd   = new Date('2026-06-01T11:30:00.000Z');
    const newStart      = new Date('2026-06-01T10:30:00.000Z'); // overlaps!

    mockSpecialistFindUnique.mockResolvedValue(massagistSpecialist());
    mockServiceFindMany.mockResolvedValue([{ id: SERVICE_ID, category: 'MASSAGE' }]);
    mockAppointmentFindMany.mockResolvedValue([
      { id: randomUUID(), startAt: conflictStart, endAt: conflictEnd },
    ]);
    mockAppointmentCreate.mockResolvedValue(makeAppointmentCreateResult(specId, newStart, 90));

    const res = await createBooking(postReq(
      bookingBody(specId, newStart, 90, { allowOverlap: true }),
      { 'x-user-role': 'ADMIN' },
    ));
    expect([200, 201]).toContain(res.status);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('rejects overlap override from non-admin users (OPERATOR role)', async () => {
    const specId = randomUUID();
    const conflictStart = new Date('2026-06-01T10:00:00.000Z');
    const conflictEnd   = new Date('2026-06-01T11:30:00.000Z');
    const newStart      = new Date('2026-06-01T10:30:00.000Z');

    mockSpecialistFindUnique.mockResolvedValue(massagistSpecialist());
    mockServiceFindMany.mockResolvedValue([{ id: SERVICE_ID, category: 'MASSAGE' }]);
    // First call: conflict window; second call: future slots for suggestions
    mockAppointmentFindMany.mockResolvedValueOnce([
      { id: randomUUID(), startAt: conflictStart, endAt: conflictEnd },
    ]);
    mockAppointmentFindMany.mockResolvedValueOnce([
      { startAt: conflictStart, endAt: conflictEnd },
    ]);

    const res = await createBooking(postReq(
      bookingBody(specId, newStart, 90, { allowOverlap: true }),
      { 'x-user-role': 'OPERATOR' }, // not admin — override rejected
    ));
    expect(res.status).toBe(409);
  });
});
