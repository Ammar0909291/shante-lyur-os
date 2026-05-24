/**
 * Integration tests — Specialist Performance Analytics (Phase B3).
 *
 * Tests the data layer for:
 *   GET /api/analytics/specialists
 *   GET /api/analytics/specialists/[id]/performance
 *
 * Prisma is fully mocked — no database needed.
 * Auth headers are injected directly (middleware is not exercised here).
 */

import { NextRequest } from 'next/server';
import { GET as getSpecialistList } from '@/app/api/analytics/specialists/route';
import { GET as getSpecialistDetail } from '@/app/api/analytics/specialists/[id]/performance/route';

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockFindMany   = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    specialist: {
      findMany:  (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
    appointment: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
    },
  },
}));

// ─── Seed data ────────────────────────────────────────────────────────────────

const SPECIALISTS = [
  {
    id: 'sp-1',
    specialization: 'Массажист SPA',
    user: { firstName: 'Анна', lastName: 'Иванова' },
  },
  {
    id: 'sp-2',
    specialization: 'массажист Thai',
    user: { firstName: 'Мария', lastName: 'Петрова' },
  },
  {
    id: 'sp-3',
    specialization: 'Косметолог',
    user: { firstName: 'Елена', lastName: 'Сидорова' },
  },
];

// Helper to build a mock appointment row for the list endpoint
function makeListApt(
  specialistId: string,
  clientId: string,
  totalPrice: number,
  totalDuration: number,
  startAt: Date = new Date(),
  status = 'COMPLETED',
) {
  return {
    specialistId,
    clientId,
    totalPrice: { toNumber: () => totalPrice },
    totalDuration,
    startAt,
    status,
  };
}

// Helper to build a mock appointment for the detail endpoint (includes services)
function makeDetailApt(
  clientId: string,
  totalPrice: number,
  totalDuration: number,
  services: { price: number; duration: number; id: string; name: string; category: string }[],
  startAt: Date = new Date(),
) {
  return {
    id: `apt-${Math.random()}`,
    clientId,
    totalPrice: { toNumber: () => totalPrice },
    totalDuration,
    startAt,
    services: services.map(s => ({
      price: { toNumber: () => s.price },
      duration: s.duration,
      service: { id: s.id, name: s.name, category: s.category },
    })),
  };
}

function prevPriceApt(specialistId: string, totalPrice: number) {
  return { specialistId, totalPrice: { toNumber: () => totalPrice } };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adminReq(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'ADMIN' },
  });
}

function detailReq(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  return [
    adminReq(`/api/analytics/specialists/${id}/performance`),
    { params: Promise.resolve({ id }) },
  ];
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── List endpoint ────────────────────────────────────────────────────────────

describe('GET /api/analytics/specialists', () => {
  it('returns an array on success', async () => {
    mockFindMany
      .mockResolvedValueOnce(SPECIALISTS) // specialists
      .mockResolvedValueOnce([])          // current apts
      .mockResolvedValueOnce([]);         // prev apts

    const res = await getSpecialistList(adminReq('/api/analytics/specialists'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('returns one entry per specialist', async () => {
    mockFindMany
      .mockResolvedValueOnce(SPECIALISTS)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: unknown[];
    };

    expect(data).toHaveLength(SPECIALISTS.length);
  });

  it('each entry has the required SpecialistPerformanceSummary shape', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: Record<string, unknown>[];
    };

    const s = data[0];
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('name');
    expect(s).toHaveProperty('specialistType');
    expect(s).toHaveProperty('totalSessions');
    expect(s).toHaveProperty('revenueGenerated');
    expect(s).toHaveProperty('avgSessionDuration');
    expect(s).toHaveProperty('clientRetentionRate');
    expect(s).toHaveProperty('workloadCompliance');
    expect(s).toHaveProperty('trendVsLastMonth');
  });

  it('deriveSpecialistType correctly tags massage and cosmetology', async () => {
    mockFindMany
      .mockResolvedValueOnce(SPECIALISTS)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { id: string; specialistType: string }[];
    };

    expect(data.find(s => s.id === 'sp-1')?.specialistType).toBe('MASSAGE');
    expect(data.find(s => s.id === 'sp-2')?.specialistType).toBe('MASSAGE');
    expect(data.find(s => s.id === 'sp-3')?.specialistType).toBe('COSMETOLOGY');
  });

  it('full name is composed from user.firstName and user.lastName', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { name: string }[];
    };

    expect(data[0].name).toBe('Анна Иванова');
  });

  it('totalSessions counts completed appointments for each specialist', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([
        makeListApt('sp-1', 'cl-1', 3000, 60),
        makeListApt('sp-1', 'cl-2', 3000, 60),
        makeListApt('sp-1', 'cl-3', 3000, 60),
      ])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { totalSessions: number }[];
    };

    expect(data[0].totalSessions).toBe(3);
  });

  it('revenueGenerated sums totalPrice for the specialist', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([
        makeListApt('sp-1', 'cl-1', 2000, 60),
        makeListApt('sp-1', 'cl-2', 3500, 90),
      ])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { revenueGenerated: number }[];
    };

    expect(data[0].revenueGenerated).toBe(5500);
  });

  it('avgSessionDuration is rounded mean of appointment durations', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([
        makeListApt('sp-1', 'cl-1', 0, 60),
        makeListApt('sp-1', 'cl-2', 0, 90),
        makeListApt('sp-1', 'cl-3', 0, 90),
      ])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { avgSessionDuration: number }[];
    };

    expect(data[0].avgSessionDuration).toBe(80); // (60+90+90)/3
  });

  it('clientRetentionRate = repeat clients / unique clients × 100', async () => {
    // cl-1 appears twice → repeat; cl-2 once → not repeat
    // rate = 1/2 * 100 = 50
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([
        makeListApt('sp-1', 'cl-1', 3000, 60),
        makeListApt('sp-1', 'cl-1', 3000, 60),
        makeListApt('sp-1', 'cl-2', 3000, 60),
      ])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { clientRetentionRate: number }[];
    };

    expect(data[0].clientRetentionRate).toBe(50);
  });

  it('workloadCompliance is null for COSMETOLOGY specialists', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[2]]) // cosmetology
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { workloadCompliance: number | null }[];
    };

    expect(data[0].workloadCompliance).toBeNull();
  });

  it('workloadCompliance is a number for MASSAGE specialists', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]]) // massage
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { workloadCompliance: number | null }[];
    };

    expect(typeof data[0].workloadCompliance).toBe('number');
  });

  it('trendVsLastMonth returns 0 when previous period revenue is 0 (no division by zero)', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([makeListApt('sp-1', 'cl-1', 5000, 60)])
      .mockResolvedValueOnce([]); // prev period — 0 revenue

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { trendVsLastMonth: number }[];
    };

    expect(data[0].trendVsLastMonth).toBe(0);
  });

  it('trendVsLastMonth calculates correct percentage vs previous period', async () => {
    mockFindMany
      .mockResolvedValueOnce([SPECIALISTS[0]])
      .mockResolvedValueOnce([makeListApt('sp-1', 'cl-1', 12000, 60)])
      .mockResolvedValueOnce([prevPriceApt('sp-1', 10000)]);

    const { data } = (await (await getSpecialistList(adminReq('/api/analytics/specialists'))).json()) as {
      data: { trendVsLastMonth: number }[];
    };

    expect(data[0].trendVsLastMonth).toBe(20); // (12000-10000)/10000*100 = 20%
  });

  it('returns empty array when no specialists match type filter', async () => {
    mockFindMany.mockResolvedValueOnce([]); // filtered out at specialist query level

    const req = new NextRequest(
      'http://localhost:3000/api/analytics/specialists?type=MASSAGE',
      { headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'ADMIN' } },
    );
    const res = await getSpecialistList(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
  });

  it('returns 401 when no auth headers are present', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/specialists');
    const res = await getSpecialistList(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for CLIENT role', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/specialists', {
      headers: { 'x-user-id': 'usr-1', 'x-user-role': 'CLIENT' },
    });
    const res = await getSpecialistList(req);
    expect(res.status).toBe(403);
  });
});

// ─── Detail endpoint ──────────────────────────────────────────────────────────

describe('GET /api/analytics/specialists/[id]/performance', () => {
  const massage = SPECIALISTS[0];
  const cosmo = SPECIALISTS[2];

  it('returns 404 when specialist does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const [req, ctx] = detailReq('nonexistent-id');
    const res = await getSpecialistDetail(req, ctx);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error?.code).toBe('NOT_FOUND');
  });

  it('returns correct shape for a massage specialist', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([]) // current apts
      .mockResolvedValueOnce([]); // prev apts

    const [req, ctx] = detailReq('sp-1');
    const res = await getSpecialistDetail(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    expect(d).toHaveProperty('id');
    expect(d).toHaveProperty('name');
    expect(d).toHaveProperty('specialistType');
    expect(d).toHaveProperty('totalSessions');
    expect(d).toHaveProperty('revenueGenerated');
    expect(d).toHaveProperty('avgSessionDuration');
    expect(d).toHaveProperty('clientRetentionRate');
    expect(d).toHaveProperty('workloadCompliance');
    expect(d).toHaveProperty('trendVsLastMonth');
    expect(d).toHaveProperty('byServiceCategory');
    expect(d).toHaveProperty('dailySessions');
    expect(d).toHaveProperty('topServices');
    expect(d).toHaveProperty('repeatClientRatio');
    expect(d).toHaveProperty('totalUniqueClients');
  });

  it('workloadCompliance is null for COSMETOLOGY', async () => {
    mockFindUnique.mockResolvedValueOnce(cosmo);
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-3');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    expect(json.data.workloadCompliance).toBeNull();
  });

  it('workloadCompliance is a number for MASSAGE', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    expect(typeof json.data.workloadCompliance).toBe('number');
  });

  it('dailySessions has exactly 30 entries for a 30-day default window', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    expect(Array.isArray(json.data.dailySessions)).toBe(true);
    expect(json.data.dailySessions).toHaveLength(30);
  });

  it('each dailySession entry has date, count, and revenue fields', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    const point = json.data.dailySessions[0] as Record<string, unknown>;
    expect(point).toHaveProperty('date');
    expect(point).toHaveProperty('count');
    expect(point).toHaveProperty('revenue');
    expect(typeof point.date).toBe('string');
    expect(typeof point.count).toBe('number');
    expect(typeof point.revenue).toBe('number');
  });

  it('dailySessions are zero-filled on days with no appointments', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([]) // no apts
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    const points = json.data.dailySessions as { count: number; revenue: number }[];
    const allZero = points.every(p => p.count === 0 && p.revenue === 0);
    expect(allZero).toBe(true);
  });

  it('byServiceCategory groups appointments by service category', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([
        makeDetailApt('cl-1', 3000, 60, [
          { price: 1500, duration: 30, id: 'svc-a', name: 'Массаж спины', category: 'MASSAGE' },
          { price: 1500, duration: 30, id: 'svc-b', name: 'Массаж шеи', category: 'MASSAGE' },
        ]),
        makeDetailApt('cl-2', 2000, 60, [
          { price: 2000, duration: 60, id: 'svc-c', name: 'Уход за лицом', category: 'FACE' },
        ]),
      ])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    const cats = json.data.byServiceCategory as { category: string; sessionCount: number }[];
    const massageCat = cats.find(c => c.category === 'MASSAGE');
    const faceCat = cats.find(c => c.category === 'FACE');

    expect(massageCat).toBeDefined();
    expect(massageCat?.sessionCount).toBe(2);
    expect(faceCat).toBeDefined();
    expect(faceCat?.sessionCount).toBe(1);
  });

  it('byServiceCategory avgDuration is correct', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([
        makeDetailApt('cl-1', 3000, 90, [
          { price: 1500, duration: 60, id: 'svc-a', name: 'Массаж', category: 'MASSAGE' },
          { price: 1500, duration: 90, id: 'svc-b', name: 'Глубокий массаж', category: 'MASSAGE' },
        ]),
      ])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    const cats = json.data.byServiceCategory as { category: string; avgDuration: number }[];
    const massageCat = cats.find(c => c.category === 'MASSAGE');
    expect(massageCat?.avgDuration).toBe(75); // (60+90)/2
  });

  it('topServices is sorted by sessionCount descending', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([
        makeDetailApt('cl-1', 1000, 60, [
          { price: 1000, duration: 60, id: 'svc-a', name: 'Сервис А', category: 'MASSAGE' },
        ]),
        makeDetailApt('cl-2', 1000, 60, [
          { price: 1000, duration: 60, id: 'svc-b', name: 'Сервис Б', category: 'MASSAGE' },
        ]),
        makeDetailApt('cl-3', 1000, 60, [
          { price: 1000, duration: 60, id: 'svc-a', name: 'Сервис А', category: 'MASSAGE' },
        ]),
      ])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    const top = json.data.topServices as { serviceName: string; sessionCount: number }[];
    expect(top[0].serviceName).toBe('Сервис А');
    expect(top[0].sessionCount).toBe(2);
    expect(top[1].serviceName).toBe('Сервис Б');
  });

  it('totalUniqueClients counts distinct clients', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([
        makeDetailApt('cl-1', 3000, 60, []),
        makeDetailApt('cl-1', 3000, 60, []),
        makeDetailApt('cl-2', 3000, 60, []),
      ])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    expect(json.data.totalUniqueClients).toBe(2);
  });

  it('repeatClientRatio = repeat clients / unique clients × 100', async () => {
    // cl-1 appears 3 times → repeat; cl-2 once → not; cl-3 once → not
    // rate = 1/3 * 100 = 33
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([
        makeDetailApt('cl-1', 3000, 60, []),
        makeDetailApt('cl-1', 3000, 60, []),
        makeDetailApt('cl-1', 3000, 60, []),
        makeDetailApt('cl-2', 3000, 60, []),
        makeDetailApt('cl-3', 3000, 60, []),
      ])
      .mockResolvedValueOnce([]);

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    expect(json.data.repeatClientRatio).toBe(33);
  });

  it('trendVsLastMonth returns 0 when prev period has 0 revenue', async () => {
    mockFindUnique.mockResolvedValueOnce(massage);
    mockFindMany
      .mockResolvedValueOnce([makeDetailApt('cl-1', 8000, 60, [])])
      .mockResolvedValueOnce([]); // 0 prev revenue

    const [req, ctx] = detailReq('sp-1');
    const json = await (await getSpecialistDetail(req, ctx)).json();

    expect(json.data.trendVsLastMonth).toBe(0);
  });

  it('returns 401 without auth headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/specialists/sp-1/performance');
    const res = await getSpecialistDetail(req, { params: Promise.resolve({ id: 'sp-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for SPECIALIST role', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/analytics/specialists/sp-1/performance',
      { headers: { 'x-user-id': 'usr-1', 'x-user-role': 'SPECIALIST' } },
    );
    const res = await getSpecialistDetail(req, { params: Promise.resolve({ id: 'sp-1' }) });
    expect(res.status).toBe(403);
  });
});
