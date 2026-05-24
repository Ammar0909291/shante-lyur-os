/**
 * Integration tests — Analytics Dashboard KPI endpoints (Phase B1).
 *
 * Tests the data layer for:
 *   GET /api/analytics/dashboard/bookings
 *   GET /api/analytics/dashboard/specialists
 *   GET /api/analytics/dashboard/revenue
 *   GET /api/analytics/dashboard/summary
 *
 * Prisma is fully mocked — no database needed.
 * Auth headers are injected directly (middleware is not exercised here).
 */

import { NextRequest } from 'next/server';
import { GET as getBookings } from '@/app/api/analytics/dashboard/bookings/route';
import { GET as getSpecialists } from '@/app/api/analytics/dashboard/specialists/route';
import { GET as getRevenue } from '@/app/api/analytics/dashboard/revenue/route';
import { GET as getSummary } from '@/app/api/analytics/dashboard/summary/route';

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockAppointmentFindMany = jest.fn();
const mockAppointmentCount    = jest.fn();
const mockAppointmentAggregate = jest.fn();
const mockAppointmentGroupBy  = jest.fn();
const mockSpecialistFindMany  = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    appointment: {
      findMany:  (...a: unknown[]) => mockAppointmentFindMany(...a),
      count:     (...a: unknown[]) => mockAppointmentCount(...a),
      aggregate: (...a: unknown[]) => mockAppointmentAggregate(...a),
      groupBy:   (...a: unknown[]) => mockAppointmentGroupBy(...a),
    },
    specialist: {
      findMany: (...a: unknown[]) => mockSpecialistFindMany(...a),
    },
  },
}));

// ─── Seed data ────────────────────────────────────────────────────────────────

const SPECIALISTS = [
  { id: 'sp-massage-1', status: 'ACTIVE',   specialization: 'Массажист SPA' },  // MASSAGE, below target
  { id: 'sp-massage-2', status: 'ACTIVE',   specialization: 'массажист Thai' }, // MASSAGE, meeting target
  { id: 'sp-cosmo-1',  status: 'ACTIVE',   specialization: 'Косметолог' },     // COSMETOLOGY
];

// sp-massage-1: 3 × 60 min = 3.0 units → belowTarget
const MASSAGE_1_APTS = [
  { specialistId: 'sp-massage-1', totalDuration: 60 },
  { specialistId: 'sp-massage-1', totalDuration: 60 },
  { specialistId: 'sp-massage-1', totalDuration: 60 },
];

// sp-massage-2: 3 × 60 min + 2 × 90 min = 3.0 + 3.0 = 6.0 units → meetingTarget
// The 90-min appointments prove 1.5-unit counting: without it, 3 + 2 = 5.0 → would be belowTarget
const MASSAGE_2_APTS = [
  { specialistId: 'sp-massage-2', totalDuration: 60 },
  { specialistId: 'sp-massage-2', totalDuration: 60 },
  { specialistId: 'sp-massage-2', totalDuration: 60 },
  { specialistId: 'sp-massage-2', totalDuration: 90 }, // 1.5 units
  { specialistId: 'sp-massage-2', totalDuration: 90 }, // 1.5 units
];

// Today's appointments for booking-endpoint tests
const TODAY_APTS = [
  { status: 'COMPLETED',   specialist: { specialization: 'Массажист SPA' } },
  { status: 'COMPLETED',   specialist: { specialization: 'Косметолог' } },
  { status: 'PENDING',     specialist: { specialization: 'Косметолог' } },
  { status: 'CONFIRMED',   specialist: { specialization: 'массажист Thai' } },
  { status: 'CANCELLED',   specialist: { specialization: 'Косметолог' } },
  { status: 'NO_SHOW',     specialist: { specialization: 'Косметолог' } },
  { status: 'IN_PROGRESS', specialist: { specialization: 'Косметолог' } },
];

// Revenue appointments (all COMPLETED)
const REVENUE_APTS = [
  { totalPrice: '3000.00', specialist: { specialization: 'Массажист SPA' } },
  { totalPrice: '5000.00', specialist: { specialization: 'Косметолог' } },
  { totalPrice: '2500.00', specialist: { specialization: 'массажист Thai' } },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function adminReq(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'ADMIN' },
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── /bookings ────────────────────────────────────────────────────────────────

describe('GET /api/analytics/dashboard/bookings', () => {
  it('returns correct shape', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce(TODAY_APTS);
    mockAppointmentCount.mockResolvedValueOnce(5); // yesterday
    mockAppointmentCount.mockResolvedValueOnce(6); // last week

    const res = await getBookings(adminReq('/api/analytics/dashboard/bookings'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    expect(d).toHaveProperty('today');
    expect(d.today).toHaveProperty('total');
    expect(d.today).toHaveProperty('completed');
    expect(d.today).toHaveProperty('upcoming');
    expect(d.today).toHaveProperty('cancelled');
    expect(d.today).toHaveProperty('byType');
    expect(d.today.byType).toHaveProperty('cosmetology');
    expect(d.today.byType).toHaveProperty('massage');
    expect(d).toHaveProperty('trend');
    expect(d.trend).toHaveProperty('vsYesterday');
    expect(d.trend).toHaveProperty('vsLastWeek');
  });

  it('today.total matches the seeded appointment count', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce(TODAY_APTS);
    mockAppointmentCount.mockResolvedValueOnce(0);
    mockAppointmentCount.mockResolvedValueOnce(0);

    const res = await getBookings(adminReq('/api/analytics/dashboard/bookings'));
    const json = await res.json();

    expect(json.data.today.total).toBe(TODAY_APTS.length); // 7
  });

  it('counts COMPLETED, upcoming, and cancelled correctly', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce(TODAY_APTS);
    mockAppointmentCount.mockResolvedValueOnce(0);
    mockAppointmentCount.mockResolvedValueOnce(0);

    const { data } = (await (await getBookings(adminReq('/api/analytics/dashboard/bookings'))).json()) as {
      data: { today: { completed: number; upcoming: number; cancelled: number } };
    };

    expect(data.today.completed).toBe(2); // COMPLETED × 2
    expect(data.today.upcoming).toBe(3);  // PENDING + CONFIRMED + IN_PROGRESS
    expect(data.today.cancelled).toBe(2); // CANCELLED + NO_SHOW
  });

  it('byType.massage correctly counts MASSAGE specialist appointments', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce(TODAY_APTS);
    mockAppointmentCount.mockResolvedValueOnce(0);
    mockAppointmentCount.mockResolvedValueOnce(0);

    const { data } = (await (await getBookings(adminReq('/api/analytics/dashboard/bookings'))).json()) as {
      data: { today: { byType: { massage: number; cosmetology: number } } };
    };

    // Appointments with MASSAGE specialists: sp-massage-1 (Массажист SPA) × 1 + sp-massage-2 (массажист Thai) × 1
    expect(data.today.byType.massage).toBe(2);
    expect(data.today.byType.cosmetology).toBe(5);
  });

  it('trend fields are numbers', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce(TODAY_APTS);
    mockAppointmentCount.mockResolvedValueOnce(7);
    mockAppointmentCount.mockResolvedValueOnce(7);

    const { data } = (await (await getBookings(adminReq('/api/analytics/dashboard/bookings'))).json()) as {
      data: { trend: { vsYesterday: number; vsLastWeek: number } };
    };

    expect(typeof data.trend.vsYesterday).toBe('number');
    expect(typeof data.trend.vsLastWeek).toBe('number');
    expect(data.trend.vsYesterday).toBe(0); // same count → 0%
  });

  it('trend returns 0 when previous period had 0 bookings (avoids division by zero)', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce(TODAY_APTS);
    mockAppointmentCount.mockResolvedValueOnce(0); // yesterday
    mockAppointmentCount.mockResolvedValueOnce(0); // last week

    const { data } = (await (await getBookings(adminReq('/api/analytics/dashboard/bookings'))).json()) as {
      data: { trend: { vsYesterday: number; vsLastWeek: number } };
    };

    expect(data.trend.vsYesterday).toBe(0);
    expect(data.trend.vsLastWeek).toBe(0);
  });

  it('returns 401 when no auth headers are present', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/dashboard/bookings');
    const res = await getBookings(req);
    expect(res.status).toBe(401);
  });
});

// ─── /specialists ─────────────────────────────────────────────────────────────

describe('GET /api/analytics/dashboard/specialists', () => {
  it('returns correct shape', async () => {
    mockSpecialistFindMany.mockResolvedValueOnce(SPECIALISTS);
    mockAppointmentGroupBy.mockResolvedValueOnce([{ specialistId: 'sp-massage-1' }]);
    mockAppointmentFindMany.mockResolvedValueOnce([...MASSAGE_1_APTS, ...MASSAGE_2_APTS]);

    const res = await getSpecialists(adminReq('/api/analytics/dashboard/specialists'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    expect(d).toHaveProperty('total');
    expect(d).toHaveProperty('active');
    expect(d).toHaveProperty('byType');
    expect(d.byType).toHaveProperty('cosmetology');
    expect(d.byType).toHaveProperty('massage');
    expect(d).toHaveProperty('workingToday');
    expect(d).toHaveProperty('massageWorkload');
    expect(d.massageWorkload).toHaveProperty('meetingTarget');
    expect(d.massageWorkload).toHaveProperty('belowTarget');
    expect(d.massageWorkload).toHaveProperty('overridden');
  });

  it('correctly counts total, active, and byType', async () => {
    mockSpecialistFindMany.mockResolvedValueOnce(SPECIALISTS);
    mockAppointmentGroupBy.mockResolvedValueOnce([]);
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialists(adminReq('/api/analytics/dashboard/specialists'))).json()) as {
      data: { total: number; active: number; byType: { massage: number; cosmetology: number } };
    };

    expect(data.total).toBe(3);
    expect(data.active).toBe(3);
    expect(data.byType.massage).toBe(2);
    expect(data.byType.cosmetology).toBe(1);
  });

  it('massageWorkload.belowTarget correctly identifies under-target specialist', async () => {
    mockSpecialistFindMany.mockResolvedValueOnce(SPECIALISTS);
    mockAppointmentGroupBy.mockResolvedValueOnce([]);
    mockAppointmentFindMany.mockResolvedValueOnce([...MASSAGE_1_APTS, ...MASSAGE_2_APTS]);

    const { data } = (await (await getSpecialists(adminReq('/api/analytics/dashboard/specialists'))).json()) as {
      data: { massageWorkload: { meetingTarget: number; belowTarget: number } };
    };

    // sp-massage-1: 3.0 units → belowTarget
    // sp-massage-2: 6.0 units → meetingTarget
    expect(data.massageWorkload.belowTarget).toBe(1);
    expect(data.massageWorkload.meetingTarget).toBe(1);
  });

  it('90-min session counts as 1.5 units toward workload total', async () => {
    // sp-massage-2 has 3×60 + 2×90 = 3.0 + 3.0 = 6.0 units (exactly at target)
    // Without 1.5 counting: 3×1 + 2×1 = 5 → belowTarget (wrong)
    mockSpecialistFindMany.mockResolvedValueOnce([SPECIALISTS[1]]); // only sp-massage-2
    mockAppointmentGroupBy.mockResolvedValueOnce([]);
    mockAppointmentFindMany.mockResolvedValueOnce(MASSAGE_2_APTS);

    const { data } = (await (await getSpecialists(adminReq('/api/analytics/dashboard/specialists'))).json()) as {
      data: { massageWorkload: { meetingTarget: number; belowTarget: number } };
    };

    expect(data.massageWorkload.meetingTarget).toBe(1);
    expect(data.massageWorkload.belowTarget).toBe(0);
  });

  it('no massage specialists → workload counts are all 0', async () => {
    mockSpecialistFindMany.mockResolvedValueOnce([SPECIALISTS[2]]); // only cosmetology
    mockAppointmentGroupBy.mockResolvedValueOnce([]);
    // findMany for massage apts should NOT be called when no massage specialists
    // (the route short-circuits with [])

    const { data } = (await (await getSpecialists(adminReq('/api/analytics/dashboard/specialists'))).json()) as {
      data: { massageWorkload: { meetingTarget: number; belowTarget: number; overridden: number } };
    };

    expect(data.massageWorkload.meetingTarget).toBe(0);
    expect(data.massageWorkload.belowTarget).toBe(0);
    expect(data.massageWorkload.overridden).toBe(0);
  });
});

// ─── /revenue ─────────────────────────────────────────────────────────────────

describe('GET /api/analytics/dashboard/revenue', () => {
  function setupRevenueMocks({
    weekApts = REVENUE_APTS,
    lastWeekTotal = 8000,
    last30Total = 90000,
    prev30Total = 85000,
    todayTotal = 8000,
  } = {}) {
    mockAppointmentFindMany.mockResolvedValueOnce(weekApts);
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: lastWeekTotal } });
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: last30Total } });
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: prev30Total } });
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: todayTotal } });
  }

  it('returns correct shape', async () => {
    setupRevenueMocks();
    const res = await getRevenue(adminReq('/api/analytics/dashboard/revenue'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    expect(d).toHaveProperty('thisWeek');
    expect(d.thisWeek).toHaveProperty('total');
    expect(d.thisWeek).toHaveProperty('byType');
    expect(d.thisWeek.byType).toHaveProperty('cosmetology');
    expect(d.thisWeek.byType).toHaveProperty('massage');
    expect(d).toHaveProperty('trend');
    expect(d.trend).toHaveProperty('vsLastWeek');
    expect(d.trend).toHaveProperty('vsLastMonth');
    expect(d).toHaveProperty('today');
  });

  it('revenue only counts COMPLETED appointments', async () => {
    // The route filters status:'COMPLETED' in the Prisma query.
    // We verify the totalPrice sum uses only the mocked (pre-filtered) apts.
    setupRevenueMocks({ weekApts: REVENUE_APTS });

    const { data } = (await (await getRevenue(adminReq('/api/analytics/dashboard/revenue'))).json()) as {
      data: { thisWeek: { total: number } };
    };

    const expectedTotal = 3000 + 5000 + 2500;
    expect(data.thisWeek.total).toBe(expectedTotal);
  });

  it('byType splits revenue between massage and cosmetology', async () => {
    setupRevenueMocks();

    const { data } = (await (await getRevenue(adminReq('/api/analytics/dashboard/revenue'))).json()) as {
      data: { thisWeek: { byType: { massage: number; cosmetology: number }; total: number } };
    };

    // massage: 3000 (sp-massage-1) + 2500 (sp-massage-2) = 5500
    // cosmetology: 5000
    expect(data.thisWeek.byType.massage).toBe(5500);
    expect(data.thisWeek.byType.cosmetology).toBe(5000);
    expect(data.thisWeek.byType.massage + data.thisWeek.byType.cosmetology).toBe(data.thisWeek.total);
  });

  it('trend fields are numbers', async () => {
    setupRevenueMocks();

    const { data } = (await (await getRevenue(adminReq('/api/analytics/dashboard/revenue'))).json()) as {
      data: { trend: { vsLastWeek: number; vsLastMonth: number } };
    };

    expect(typeof data.trend.vsLastWeek).toBe('number');
    expect(typeof data.trend.vsLastMonth).toBe('number');
  });

  it('trend returns 0 when previous period revenue is 0 (avoids division by zero)', async () => {
    setupRevenueMocks({ lastWeekTotal: 0, prev30Total: 0 });

    const { data } = (await (await getRevenue(adminReq('/api/analytics/dashboard/revenue'))).json()) as {
      data: { trend: { vsLastWeek: number; vsLastMonth: number } };
    };

    expect(data.trend.vsLastWeek).toBe(0);
    expect(data.trend.vsLastMonth).toBe(0);
  });

  it('returns 0 for today revenue when no completed appointments exist', async () => {
    setupRevenueMocks({ weekApts: [], todayTotal: null as unknown as number });

    const { data } = (await (await getRevenue(adminReq('/api/analytics/dashboard/revenue'))).json()) as {
      data: { today: number };
    };

    expect(data.today).toBe(0);
  });
});

// ─── /summary ─────────────────────────────────────────────────────────────────

describe('GET /api/analytics/dashboard/summary', () => {
  function setupSummaryMocks() {
    // Call order matches Promise.all in summary/route.ts
    mockAppointmentFindMany.mockResolvedValueOnce(TODAY_APTS);           // today's apts (bookings)
    mockAppointmentCount.mockResolvedValueOnce(5);                        // yesterday count
    mockAppointmentCount.mockResolvedValueOnce(6);                        // last week same day
    mockSpecialistFindMany.mockResolvedValueOnce(SPECIALISTS);            // all specialists
    mockAppointmentGroupBy.mockResolvedValueOnce([{ specialistId: 'sp-massage-1' }]); // working today
    mockAppointmentFindMany.mockResolvedValueOnce(REVENUE_APTS);          // this week revenue apts
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: 8000 } });  // last week rev
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: 90000 } }); // last 30 days
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: 85000 } }); // prev 30 days
    mockAppointmentAggregate.mockResolvedValueOnce({ _sum: { totalPrice: 5000 } });  // today rev
    // Summary fetches massage apts separately after the batch
    mockAppointmentFindMany.mockResolvedValueOnce([...MASSAGE_1_APTS, ...MASSAGE_2_APTS]);
  }

  it('returns all three sections with correct shapes', async () => {
    setupSummaryMocks();

    const res = await getSummary(adminReq('/api/analytics/dashboard/summary'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    // bookings section
    expect(d).toHaveProperty('bookings');
    expect(d.bookings).toHaveProperty('today');
    expect(d.bookings).toHaveProperty('trend');

    // specialists section
    expect(d).toHaveProperty('specialists');
    expect(d.specialists).toHaveProperty('massageWorkload');

    // revenue section
    expect(d).toHaveProperty('revenue');
    expect(d.revenue).toHaveProperty('thisWeek');
    expect(d.revenue).toHaveProperty('trend');
    expect(d.revenue).toHaveProperty('today');
  });

  it('generatedAt is a valid ISO 8601 timestamp', async () => {
    setupSummaryMocks();

    const { data } = (await (await getSummary(adminReq('/api/analytics/dashboard/summary'))).json()) as {
      data: { generatedAt: string };
    };

    expect(typeof data.generatedAt).toBe('string');
    expect(() => new Date(data.generatedAt).toISOString()).not.toThrow();
    expect(new Date(data.generatedAt).toISOString()).toBe(data.generatedAt);
  });

  it('summary bookings.today.total matches individual bookings endpoint', async () => {
    setupSummaryMocks();

    const { data } = (await (await getSummary(adminReq('/api/analytics/dashboard/summary'))).json()) as {
      data: { bookings: { today: { total: number } } };
    };

    expect(data.bookings.today.total).toBe(TODAY_APTS.length);
  });

  it('summary massageWorkload correctly identifies belowTarget specialist', async () => {
    setupSummaryMocks();

    const { data } = (await (await getSummary(adminReq('/api/analytics/dashboard/summary'))).json()) as {
      data: { specialists: { massageWorkload: { belowTarget: number; meetingTarget: number } } };
    };

    expect(data.specialists.massageWorkload.belowTarget).toBe(1);
    expect(data.specialists.massageWorkload.meetingTarget).toBe(1);
  });

  it('returns 401 without auth headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/dashboard/summary');
    const res = await getSummary(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin role', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/dashboard/summary', {
      headers: { 'x-user-id': 'usr-1', 'x-user-role': 'CLIENT' },
    });
    const res = await getSummary(req);
    expect(res.status).toBe(403);
  });
});
