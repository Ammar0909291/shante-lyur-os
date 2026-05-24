import { NextRequest } from 'next/server';
import { GET as exportSpecialists } from '@/app/api/analytics/export/specialists/route';
import { GET as exportMassage } from '@/app/api/analytics/export/massage-workload/route';
import { GET as exportFinancial } from '@/app/api/analytics/export/financial/route';
import { GET as exportBookings } from '@/app/api/analytics/export/bookings/route';

// ─── Prisma mocks ──────────────────────────────────────────────────────────────

const mockSpecialistFindMany = jest.fn();
const mockAppointmentFindMany = jest.fn();
const mockAppointmentAggregate = jest.fn();
const mockWorkloadOverrideFindMany = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => {
  const mockSpec = jest.fn();
  const mockApt = jest.fn();
  const mockAgg = jest.fn();
  const mockOv = jest.fn();
  return {
    prisma: {
      specialist: { findMany: mockSpec },
      appointment: { findMany: mockApt, aggregate: mockAgg },
      workloadOverride: { findMany: mockOv },
    },
  };
});

// Wire the module-level vars to the hoisted mocks after import
beforeAll(() => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      specialist: { findMany: jest.Mock };
      appointment: { findMany: jest.Mock; aggregate: jest.Mock };
      workloadOverride: { findMany: jest.Mock };
    };
  };
  mockSpecialistFindMany.mockImplementation((...args) => prisma.specialist.findMany(...args));
  mockAppointmentFindMany.mockImplementation((...args) => prisma.appointment.findMany(...args));
  mockAppointmentAggregate.mockImplementation((...args) => prisma.appointment.aggregate(...args));
  mockWorkloadOverrideFindMany.mockImplementation((...args) =>
    prisma.workloadOverride.findMany(...args),
  );
});

// ─── Test data ────────────────────────────────────────────────────────────────

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MASSAGE_SPECIALIST = {
  id: 'spec-mass-1',
  specialization: 'Массажист',
  user: { firstName: 'Анна', lastName: 'Иванова' },
};

const COSM_SPECIALIST = {
  id: 'spec-cosm-1',
  specialization: 'Косметолог',
  user: { firstName: 'Мария', lastName: 'Петрова' },
};

const MON_10 = new Date('2026-05-18T07:00:00Z');
const TUE_10 = new Date('2026-05-19T07:00:00Z');

function makeApt(overrides: Partial<{
  specialistId: string; clientId: string;
  totalPrice: number; totalDuration: number;
  startAt: Date; status: string;
}> = {}) {
  return {
    specialistId: overrides.specialistId ?? 'spec-mass-1',
    clientId: overrides.clientId ?? 'client-1',
    totalPrice: { toNumber: () => overrides.totalPrice ?? 3000 },
    totalDuration: overrides.totalDuration ?? 60,
    startAt: overrides.startAt ?? MON_10,
    status: overrides.status ?? 'COMPLETED',
    specialist: { specialization: 'Массажист', user: { firstName: 'Анна', lastName: 'Иванова' } },
    client: { firstName: 'Иван', lastName: 'Сидоров' },
    services: [
      { price: { toNumber: () => 3000 }, service: { name: 'Классический массаж', category: 'MASSAGE' } },
    ],
  };
}

function adminReq(url: string): NextRequest {
  return new NextRequest(url, {
    headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN' },
  });
}

function noAuthReq(url: string): NextRequest {
  return new NextRequest(url);
}

// ─── Helper: assert xlsx response ────────────────────────────────────────────

async function assertXlsx(res: Response) {
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain(XLSX_MIME);
  expect(res.headers.get('content-disposition')).toContain('.xlsx');
  const buf = await res.arrayBuffer();
  expect(buf.byteLength).toBeGreaterThan(0);
}

// ─── Suite: /export/specialists ───────────────────────────────────────────────

describe('GET /api/analytics/export/specialists', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      specialist: { findMany: jest.Mock };
      appointment: { findMany: jest.Mock; aggregate: jest.Mock };
      workloadOverride: { findMany: jest.Mock };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.specialist.findMany.mockResolvedValue([MASSAGE_SPECIALIST, COSM_SPECIALIST]);
    prisma.appointment.findMany
      .mockResolvedValueOnce([makeApt(), makeApt({ clientId: 'client-2', startAt: TUE_10 })])
      .mockResolvedValueOnce([]);
  });

  it('returns 200 with xlsx content-type and disposition', async () => {
    const res = await exportSpecialists(adminReq('http://t/api/analytics/export/specialists'));
    await assertXlsx(res);
  });

  it('filename contains specialists-performance', async () => {
    const res = await exportSpecialists(adminReq('http://t/api/analytics/export/specialists'));
    expect(res.headers.get('content-disposition')).toContain('specialists-performance');
  });

  it('returns valid xlsx with no appointments', async () => {
    prisma.appointment.findMany.mockReset();
    prisma.appointment.findMany.mockResolvedValue([]);
    const res = await exportSpecialists(adminReq('http://t/api/analytics/export/specialists'));
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('type=MASSAGE filter accepted — returns 200', async () => {
    prisma.appointment.findMany.mockReset();
    prisma.appointment.findMany
      .mockResolvedValueOnce([makeApt()])
      .mockResolvedValueOnce([]);
    const res = await exportSpecialists(
      adminReq('http://t/api/analytics/export/specialists?type=MASSAGE'),
    );
    expect(res.status).toBe(200);
  });

  it('date range params accepted — returns 200', async () => {
    prisma.appointment.findMany.mockReset();
    prisma.appointment.findMany
      .mockResolvedValueOnce([makeApt()])
      .mockResolvedValueOnce([]);
    const res = await exportSpecialists(
      adminReq('http://t/api/analytics/export/specialists?from=2026-05-01&to=2026-05-31'),
    );
    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await exportSpecialists(noAuthReq('http://t/api/analytics/export/specialists'));
    expect(res.status).toBe(401);
  });
});

// ─── Suite: /export/massage-workload ──────────────────────────────────────────

describe('GET /api/analytics/export/massage-workload', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      specialist: { findMany: jest.Mock };
      appointment: { findMany: jest.Mock };
      workloadOverride: { findMany: jest.Mock };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.specialist.findMany.mockResolvedValue([MASSAGE_SPECIALIST]);
    prisma.appointment.findMany.mockResolvedValue([
      { specialistId: 'spec-mass-1', totalDuration: 60 },
      { specialistId: 'spec-mass-1', totalDuration: 90 },
    ]);
    prisma.workloadOverride.findMany.mockResolvedValue([]);
  });

  it('returns 200 with xlsx content-type and disposition', async () => {
    const res = await exportMassage(adminReq('http://t/api/analytics/export/massage-workload'));
    await assertXlsx(res);
  });

  it('filename contains massage-workload', async () => {
    const res = await exportMassage(adminReq('http://t/api/analytics/export/massage-workload'));
    expect(res.headers.get('content-disposition')).toContain('massage-workload');
  });

  it('date param accepted — returns 200', async () => {
    const res = await exportMassage(
      adminReq('http://t/api/analytics/export/massage-workload?date=2026-05-18'),
    );
    expect(res.status).toBe(200);
  });

  it('no massage specialists returns valid xlsx', async () => {
    prisma.specialist.findMany.mockResolvedValue([COSM_SPECIALIST]);
    const res = await exportMassage(adminReq('http://t/api/analytics/export/massage-workload'));
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('returns 401 without auth', async () => {
    const res = await exportMassage(noAuthReq('http://t/api/analytics/export/massage-workload'));
    expect(res.status).toBe(401);
  });
});

// ─── Suite: /export/financial ─────────────────────────────────────────────────

describe('GET /api/analytics/export/financial', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      appointment: { findMany: jest.Mock; aggregate: jest.Mock };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appointment.findMany.mockResolvedValue([
      makeApt({ startAt: MON_10 }),
      makeApt({ startAt: TUE_10, totalPrice: 4000 }),
    ]);
    prisma.appointment.aggregate.mockResolvedValue({ _sum: { totalPrice: null } });
  });

  it('returns 200 with xlsx content-type and disposition', async () => {
    const res = await exportFinancial(adminReq('http://t/api/analytics/export/financial'));
    await assertXlsx(res);
  });

  it('filename contains financial-report', async () => {
    const res = await exportFinancial(adminReq('http://t/api/analytics/export/financial'));
    expect(res.headers.get('content-disposition')).toContain('financial-report');
  });

  it('date range params accepted — returns 200', async () => {
    const res = await exportFinancial(
      adminReq('http://t/api/analytics/export/financial?from=2026-05-01&to=2026-05-31'),
    );
    expect(res.status).toBe(200);
  });

  it('empty period returns valid xlsx', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const res = await exportFinancial(adminReq('http://t/api/analytics/export/financial'));
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('returns 401 without auth', async () => {
    const res = await exportFinancial(noAuthReq('http://t/api/analytics/export/financial'));
    expect(res.status).toBe(401);
  });
});

// ─── Suite: /export/bookings ──────────────────────────────────────────────────

describe('GET /api/analytics/export/bookings', () => {
  const { prisma } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: { appointment: { findMany: jest.Mock } };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appointment.findMany.mockResolvedValue([
      makeApt({ startAt: MON_10 }),
      makeApt({ startAt: TUE_10, status: 'CANCELLED', totalPrice: 0 }),
    ]);
  });

  it('returns 200 with xlsx content-type and disposition', async () => {
    const res = await exportBookings(adminReq('http://t/api/analytics/export/bookings'));
    await assertXlsx(res);
  });

  it('filename contains bookings', async () => {
    const res = await exportBookings(adminReq('http://t/api/analytics/export/bookings'));
    expect(res.headers.get('content-disposition')).toContain('bookings');
  });

  it('date range params accepted — returns 200', async () => {
    const res = await exportBookings(
      adminReq('http://t/api/analytics/export/bookings?from=2026-05-01&to=2026-05-31'),
    );
    expect(res.status).toBe(200);
  });

  it('empty period returns valid xlsx with headers only', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const res = await exportBookings(adminReq('http://t/api/analytics/export/bookings'));
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('returns 401 without auth', async () => {
    const res = await exportBookings(noAuthReq('http://t/api/analytics/export/bookings'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for CLIENT role', async () => {
    const res = await exportBookings(
      new NextRequest('http://t/api/analytics/export/bookings', {
        headers: { 'x-user-id': 'client-1', 'x-user-role': 'CLIENT' },
      }),
    );
    expect(res.status).toBe(403);
  });
});
