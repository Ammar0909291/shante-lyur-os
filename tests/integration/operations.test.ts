/**
 * Operations Center integration tests.
 * Covers: today endpoint, status transitions, room management,
 * operational alert logic, specialist live-state, full booking flow.
 */
import { NextRequest } from 'next/server';
import { GET as todayGET } from '@/app/api/operations/today/route';
import { POST as transitionPOST } from '@/app/api/operations/appointments/[id]/transition/route';
import { GET as roomsGET, POST as roomsPOST } from '@/app/api/operations/rooms/route';
import { POST as assignPOST } from '@/app/api/operations/rooms/[id]/assign/route';

// ─── Prisma mocks ──────────────────────────────────────────────────────────────

const mockAppointmentFindMany = jest.fn();
const mockAppointmentFindUnique = jest.fn();
const mockAppointmentUpdate = jest.fn();
const mockSpecialistFindMany = jest.fn();
const mockRoomFindMany = jest.fn();
const mockRoomFindUnique = jest.fn();
const mockRoomCreate = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    specialist: { findMany: jest.fn() },
    room: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

beforeAll(() => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      appointment: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
      specialist: { findMany: jest.Mock };
      room: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    };
  };
  mockAppointmentFindMany.mockImplementation((...a) => prisma.appointment.findMany(...a));
  mockAppointmentFindUnique.mockImplementation((...a) => prisma.appointment.findUnique(...a));
  mockAppointmentUpdate.mockImplementation((...a) => prisma.appointment.update(...a));
  mockSpecialistFindMany.mockImplementation((...a) => prisma.specialist.findMany(...a));
  mockRoomFindMany.mockImplementation((...a) => prisma.room.findMany(...a));
  mockRoomFindUnique.mockImplementation((...a) => prisma.room.findUnique(...a));
  mockRoomCreate.mockImplementation((...a) => prisma.room.create(...a));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminReq(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function operatorReq(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-user-id': 'op-1', 'x-user-role': 'RECEPTIONIST', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function noAuthReq(url: string): NextRequest {
  return new NextRequest(url);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Moscow 10:00 on a Tuesday
const TODAY_10 = new Date('2026-05-19T07:00:00Z');
const TODAY_11 = new Date('2026-05-19T08:00:00Z');


const SPECIALIST_MASSAGE = {
  id: 'spec-m1',
  specialization: 'Массажист',
  department: 'MASSAGE',
  user: { firstName: 'Анна', lastName: 'Иванова' },
};
const SPECIALIST_COSM = {
  id: 'spec-c1',
  specialization: 'Косметолог',
  department: 'COSMETOLOGY',
  user: { firstName: 'Мария', lastName: 'Петрова' },
};


function makeApt(overrides: {
  id?: string;
  specialistId?: string;
  status?: string;
  startAt?: Date;
  endAt?: Date;
  checkedInAt?: Date | null;
  checkedOutAt?: Date | null;
  noShowAt?: Date | null;
  cancelledAt?: Date | null;
  roomId?: string | null;
  totalDuration?: number;
}) {
  const startAt = overrides.startAt ?? TODAY_10;
  const endAt = overrides.endAt ?? TODAY_11;
  return {
    id: overrides.id ?? 'apt-1',
    clientId: 'client-1',
    specialistId: overrides.specialistId ?? 'spec-m1',
    startAt,
    endAt,
    status: overrides.status ?? 'CONFIRMED',
    totalPrice: { toNumber: () => 3000 },
    totalDuration: overrides.totalDuration ?? 60,
    checkedInAt: overrides.checkedInAt ?? null,
    checkedOutAt: overrides.checkedOutAt ?? null,
    noShowAt: overrides.noShowAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    roomId: overrides.roomId ?? null,
    client: { firstName: 'Иван', lastName: 'Сидоров' },
    specialist: {
      specialization: 'Массажист',
      user: { firstName: 'Анна', lastName: 'Иванова' },
    },
    services: [{ service: { name: 'Классический массаж' } }],
    room: overrides.roomId ? { name: 'Кабинет 1', type: 'MASSAGE' } : null,
  };
}

// ─── Suite: GET /api/operations/today ─────────────────────────────────────────

describe('GET /api/operations/today', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      appointment: { findMany: jest.Mock };
      specialist: { findMany: jest.Mock };
      room: { findMany: jest.Mock };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.specialist.findMany.mockResolvedValue([SPECIALIST_MASSAGE, SPECIALIST_COSM]);
    prisma.room.findMany.mockResolvedValue([]);
  });

  it('returns 401 without auth', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const res = await todayGET(noAuthReq('http://t/api/operations/today'));
    expect(res.status).toBe(401);
  });

  it('returns success shape with all required fields', async () => {
    prisma.appointment.findMany.mockResolvedValue([makeApt({})]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { date: string; metrics: object; queue: unknown[]; specialists: unknown[]; rooms: unknown[]; alerts: unknown[] } };
    expect(typeof json.data.date).toBe('string');
    expect(json.data.metrics).toBeDefined();
    expect(Array.isArray(json.data.queue)).toBe(true);
    expect(Array.isArray(json.data.specialists)).toBe(true);
    expect(Array.isArray(json.data.rooms)).toBe(true);
    expect(Array.isArray(json.data.alerts)).toBe(true);
  });

  it('derives CONFIRMED status for a confirmed appointment without checkedInAt', async () => {
    prisma.appointment.findMany.mockResolvedValue([makeApt({ status: 'CONFIRMED', checkedInAt: null })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { queue: Array<{ operationalStatus: string }> } };
    expect(json.data.queue[0].operationalStatus).toBe('CONFIRMED');
  });

  it('derives ARRIVED when checkedInAt set and startAt in future', async () => {
    const futureStart = new Date(Date.now() + 3_600_000);
    const futureEnd = new Date(Date.now() + 7_200_000);
    prisma.appointment.findMany.mockResolvedValue([makeApt({
      status: 'CONFIRMED',
      checkedInAt: new Date(),
      startAt: futureStart,
      endAt: futureEnd,
    })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { queue: Array<{ operationalStatus: string }> } };
    expect(json.data.queue[0].operationalStatus).toBe('ARRIVED');
  });

  it('derives WAITING when checkedInAt set and startAt in past and status=CONFIRMED', async () => {
    const pastStart = new Date(Date.now() - 1_800_000);
    const futureEnd = new Date(Date.now() + 1_800_000);
    prisma.appointment.findMany.mockResolvedValue([makeApt({
      status: 'CONFIRMED',
      checkedInAt: new Date(Date.now() - 3_600_000),
      startAt: pastStart,
      endAt: futureEnd,
    })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { queue: Array<{ operationalStatus: string }> } };
    expect(json.data.queue[0].operationalStatus).toBe('WAITING');
  });

  it('counts metrics correctly', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeApt({ id: 'a1', status: 'CONFIRMED' }),
      makeApt({ id: 'a2', status: 'IN_PROGRESS' }),
      makeApt({ id: 'a3', status: 'COMPLETED' }),
      makeApt({ id: 'a4', status: 'CANCELLED' }),
    ]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { metrics: { confirmed: number; inProgress: number; completed: number; cancelled: number } } };
    expect(json.data.metrics.confirmed).toBe(1);
    expect(json.data.metrics.inProgress).toBe(1);
    expect(json.data.metrics.completed).toBe(1);
    expect(json.data.metrics.cancelled).toBe(1);
  });

  it('specialist liveStatus is BUSY when IN_PROGRESS appointment exists', async () => {
    prisma.appointment.findMany.mockResolvedValue([makeApt({ status: 'IN_PROGRESS' })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { specialists: Array<{ id: string; liveStatus: string }> } };
    const massageSpec = json.data.specialists.find(s => s.id === 'spec-m1');
    expect(massageSpec?.liveStatus).toBe('BUSY');
  });

  it('specialist liveStatus is FREE when no active appointments', async () => {
    prisma.appointment.findMany.mockResolvedValue([makeApt({ status: 'COMPLETED' })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { specialists: Array<{ id: string; liveStatus: string }> } };
    const massageSpec = json.data.specialists.find(s => s.id === 'spec-m1');
    expect(massageSpec?.liveStatus).toBe('FREE');
  });

  it('specialist liveStatus is OVERBOOKED with 2 IN_PROGRESS appointments', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeApt({ id: 'a1', status: 'IN_PROGRESS' }),
      makeApt({ id: 'a2', status: 'IN_PROGRESS' }),
    ]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { specialists: Array<{ id: string; liveStatus: string }> } };
    const massageSpec = json.data.specialists.find(s => s.id === 'spec-m1');
    expect(massageSpec?.liveStatus).toBe('OVERBOOKED');
  });

  it('massage weight is calculated for massage specialists', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeApt({ status: 'CONFIRMED', totalDuration: 60 }),
      makeApt({ id: 'a2', status: 'CONFIRMED', totalDuration: 90 }),
    ]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { specialists: Array<{ id: string; massageWeight: number | null; massageWeightTarget: number | null }> } };
    const massageSpec = json.data.specialists.find(s => s.id === 'spec-m1');
    expect(massageSpec?.massageWeight).toBe(2.5); // 1.0 + 1.5
    expect(massageSpec?.massageWeightTarget).toBe(6.0);
  });

  it('cosmetology specialist has null massageWeight', async () => {
    prisma.appointment.findMany.mockResolvedValue([makeApt({ specialistId: 'spec-c1', status: 'CONFIRMED' })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { specialists: Array<{ id: string; massageWeight: number | null }> } };
    const cosmSpec = json.data.specialists.find(s => s.id === 'spec-c1');
    expect(cosmSpec?.massageWeight).toBeNull();
  });

  it('generates LATE_CLIENT alert for confirmed appointment delayed 15+ min', async () => {
    const pastStart = new Date(Date.now() - 20 * 60_000); // 20 min ago
    const futureEnd = new Date(Date.now() + 40 * 60_000);
    prisma.appointment.findMany.mockResolvedValue([makeApt({
      status: 'CONFIRMED',
      checkedInAt: null,
      startAt: pastStart,
      endAt: futureEnd,
    })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { alerts: Array<{ type: string }> } };
    expect(json.data.alerts.some(a => a.type === 'LATE_CLIENT')).toBe(true);
  });

  it('generates ROOM_CONFLICT alert when two IN_PROGRESS appointments share a room', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeApt({ id: 'a1', status: 'IN_PROGRESS', roomId: 'room-1' }),
      makeApt({ id: 'a2', status: 'IN_PROGRESS', roomId: 'room-1' }),
    ]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { alerts: Array<{ type: string }> } };
    expect(json.data.alerts.some(a => a.type === 'ROOM_CONFLICT')).toBe(true);
  });

  it('returns empty alerts for clean schedule', async () => {
    // Future appointments, no delays
    const futureStart = new Date(Date.now() + 3_600_000);
    const futureEnd = new Date(Date.now() + 7_200_000);
    prisma.appointment.findMany.mockResolvedValue([
      makeApt({ status: 'CONFIRMED', startAt: futureStart, endAt: futureEnd }),
    ]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { alerts: unknown[] } };
    expect(json.data.alerts.length).toBe(0);
  });

  it('delayMinutes is 0 for IN_PROGRESS appointment', async () => {
    prisma.appointment.findMany.mockResolvedValue([makeApt({ status: 'IN_PROGRESS' })]);
    const res = await todayGET(adminReq('http://t/api/operations/today'));
    const json = await res.json() as { data: { queue: Array<{ delayMinutes: number }> } };
    expect(json.data.queue[0].delayMinutes).toBe(0);
  });
});

// ─── Suite: POST /api/operations/appointments/[id]/transition ─────────────────

describe('POST /api/operations/appointments/[id]/transition', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: { appointment: { findUnique: jest.Mock; update: jest.Mock } };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null, checkedOutAt: null });
  });

  it('returns 401 without auth', async () => {
    const res = await transitionPOST(noAuthReq('http://t'), makeParams('apt-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when appointment not found', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    const res = await transitionPOST(adminReq('http://t', { action: 'confirm' }), makeParams('missing'));
    expect(res.status).toBe(404);
  });

  it('confirm: PENDING → CONFIRMED', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'PENDING', checkedInAt: null });
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null, checkedOutAt: null });
    const res = await transitionPOST(adminReq('http://t', { action: 'confirm' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe('CONFIRMED');
  });

  it('checkin: sets checkedInAt without changing status', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null });
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: new Date(), checkedOutAt: null });
    const res = await transitionPOST(adminReq('http://t', { action: 'checkin' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
  });

  it('start: CONFIRMED → IN_PROGRESS', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null });
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date(), checkedOutAt: null });
    const res = await transitionPOST(adminReq('http://t', { action: 'start' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe('IN_PROGRESS');
  });

  it('complete: IN_PROGRESS → COMPLETED', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date() });
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'COMPLETED', checkedInAt: new Date(), checkedOutAt: new Date() });
    const res = await transitionPOST(adminReq('http://t', { action: 'complete' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe('COMPLETED');
  });

  it('noshow: CONFIRMED → NO_SHOW', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null });
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'NO_SHOW', checkedInAt: null, checkedOutAt: null });
    const res = await transitionPOST(adminReq('http://t', { action: 'noshow' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
  });

  it('cancel: IN_PROGRESS → CANCELLED', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date() });
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'CANCELLED', checkedInAt: new Date(), checkedOutAt: null });
    const res = await transitionPOST(adminReq('http://t', { action: 'cancel' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid transition (complete from PENDING)', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'PENDING', checkedInAt: null });
    const res = await transitionPOST(adminReq('http://t', { action: 'complete' }), makeParams('apt-1'));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 400 for invalid transition (confirm from COMPLETED)', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'COMPLETED', checkedInAt: null });
    const res = await transitionPOST(adminReq('http://t', { action: 'confirm' }), makeParams('apt-1'));
    expect(res.status).toBe(400);
  });

  it('OPERATOR can perform transitions', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'PENDING', checkedInAt: null });
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null, checkedOutAt: null });
    const res = await transitionPOST(operatorReq('http://t', { action: 'confirm' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
  });

  it('full booking flow: PENDING → confirm → checkin → start → complete', async () => {
    // Step 1: confirm
    prisma.appointment.findUnique.mockResolvedValueOnce({ id: 'apt-1', status: 'PENDING', checkedInAt: null });
    prisma.appointment.update.mockResolvedValueOnce({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null, checkedOutAt: null });
    let res = await transitionPOST(adminReq('http://t', { action: 'confirm' }), makeParams('apt-1'));
    expect(res.status).toBe(200);

    // Step 2: checkin
    prisma.appointment.findUnique.mockResolvedValueOnce({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null });
    prisma.appointment.update.mockResolvedValueOnce({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: new Date(), checkedOutAt: null });
    res = await transitionPOST(adminReq('http://t', { action: 'checkin' }), makeParams('apt-1'));
    expect(res.status).toBe(200);

    // Step 3: start
    prisma.appointment.findUnique.mockResolvedValueOnce({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: new Date() });
    prisma.appointment.update.mockResolvedValueOnce({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date(), checkedOutAt: null });
    res = await transitionPOST(adminReq('http://t', { action: 'start' }), makeParams('apt-1'));
    expect(res.status).toBe(200);

    // Step 4: complete
    prisma.appointment.findUnique.mockResolvedValueOnce({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date() });
    prisma.appointment.update.mockResolvedValueOnce({ id: 'apt-1', status: 'COMPLETED', checkedInAt: new Date(), checkedOutAt: new Date() });
    res = await transitionPOST(adminReq('http://t', { action: 'complete' }), makeParams('apt-1'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe('COMPLETED');
  });
});

// ─── Suite: GET /POST /api/operations/rooms ────────────────────────────────────

describe('GET /api/operations/rooms', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: { room: { findMany: jest.Mock } };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.room.findMany.mockResolvedValue([
      { id: 'room-1', name: 'Кабинет 1', type: 'MASSAGE', notes: null, locationId: 'loc-1', appointments: [] },
    ]);
  });

  it('returns 200 with room list', async () => {
    const res = await roomsGET(adminReq('http://t/api/operations/rooms'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: unknown[] };
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(1);
  });

  it('returns 401 without auth', async () => {
    const res = await roomsGET(noAuthReq('http://t/api/operations/rooms'));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/operations/rooms', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: { room: { create: jest.Mock } };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.room.create.mockResolvedValue({
      id: 'room-new', name: 'Массажный зал 1', type: 'MASSAGE',
      locationId: 'loc-1', notes: null, isActive: true, createdAt: new Date(),
    });
  });

  it('ADMIN can create a room', async () => {
    const res = await roomsPOST(adminReq('http://t', {
      name: 'Массажный зал 1', type: 'MASSAGE', locationId: 'loc-1',
    }));
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { name: string } };
    expect(json.data.name).toBe('Массажный зал 1');
  });

  it('OPERATOR cannot create a room (403)', async () => {
    const res = await roomsPOST(operatorReq('http://t', {
      name: 'Кабинет 2', type: 'COSMETOLOGY', locationId: 'loc-1',
    }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields missing', async () => {
    const res = await roomsPOST(adminReq('http://t', { name: 'Кабинет' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid room type', async () => {
    const res = await roomsPOST(adminReq('http://t', {
      name: 'Кабинет', type: 'INVALID', locationId: 'loc-1',
    }));
    expect(res.status).toBe(400);
  });
});

// ─── Suite: POST /api/operations/rooms/[id]/assign ────────────────────────────

describe('POST /api/operations/rooms/[id]/assign', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      room: { findUnique: jest.Mock };
      appointment: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue({ id: 'room-1', name: 'Кабинет 1' });
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1', startAt: TODAY_10, endAt: TODAY_11, status: 'CONFIRMED',
    });
    prisma.appointment.findMany.mockResolvedValue([]); // no conflicts
    prisma.appointment.update.mockResolvedValue({ id: 'apt-1', roomId: 'room-1' });
  });

  it('assigns room to appointment — returns 200', async () => {
    const res = await assignPOST(
      adminReq('http://t', { appointmentId: 'apt-1' }),
      makeParams('room-1'),
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { roomId: string; roomName: string } };
    expect(json.data.roomId).toBe('room-1');
    expect(json.data.roomName).toBe('Кабинет 1');
  });

  it('returns 409 when room is already occupied (conflict)', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { id: 'conflict-apt', startAt: TODAY_10, endAt: TODAY_11, status: 'CONFIRMED', clientId: 'c2' },
    ]);
    const res = await assignPOST(
      adminReq('http://t', { appointmentId: 'apt-1' }),
      makeParams('room-1'),
    );
    expect(res.status).toBe(409);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe('ROOM_CONFLICT');
  });

  it('returns 404 when room not found', async () => {
    prisma.room.findUnique.mockResolvedValue(null);
    const res = await assignPOST(
      adminReq('http://t', { appointmentId: 'apt-1' }),
      makeParams('missing-room'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 when appointment not found', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    const res = await assignPOST(
      adminReq('http://t', { appointmentId: 'missing-apt' }),
      makeParams('room-1'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await assignPOST(noAuthReq('http://t'), makeParams('room-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for terminal appointment status', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1', startAt: TODAY_10, endAt: TODAY_11, status: 'COMPLETED',
    });
    const res = await assignPOST(
      adminReq('http://t', { appointmentId: 'apt-1' }),
      makeParams('room-1'),
    );
    expect(res.status).toBe(400);
  });
});
