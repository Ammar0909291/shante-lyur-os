/**
 * Integration tests — Executive Intelligence module
 */
import { NextRequest } from 'next/server';

// ─── UUID constants ───────────────────────────────────────────────────────────
const UUID_USER   = '550e8400-e29b-41d4-a716-446655440020';
const UUID_SPEC   = '550e8400-e29b-41d4-a716-446655440021';
const UUID_CLIENT = '550e8400-e29b-41d4-a716-446655440022';
const UUID_APT    = '550e8400-e29b-41d4-a716-446655440023';

// ─── Prisma mock ──────────────────────────────────────────────────────────────
jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    appointment: { findMany: jest.fn(), count: jest.fn() },
    payment: { findMany: jest.fn() },
    refund: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    specialist: { findMany: jest.fn() },
    inventoryItem: { findMany: jest.fn() },
    stockMovement: { findMany: jest.fn(), aggregate: jest.fn() },
  },
}));

// ─── Route imports (after mock) ──────────────────────────────────────────────
import { GET as getIntelligence } from '@/app/api/executive/intelligence/route';
import { GET as getForecast }     from '@/app/api/executive/forecast/route';
import { GET as getRisks }        from '@/app/api/executive/risks/route';
import { GET as getRetention }    from '@/app/api/executive/retention/route';
import { GET as getExport }       from '@/app/api/executive/export/route';

// ─── Prisma mock accessor ─────────────────────────────────────────────────────
import { prisma } from '@/infrastructure/config/prisma-client';
const mp = prisma as jest.Mocked<typeof prisma>;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function adminReq(path: string, params: Record<string, string> = {}): NextRequest {
  const url = new URL(`http://localhost${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const req = new NextRequest(url.toString());
  req.headers.set('x-user-id', UUID_USER);
  req.headers.set('x-user-role', 'ADMIN');
  return req;
}

function makeApt(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_APT,
    status: 'COMPLETED',
    totalPrice: 3000,
    paidAmount: 3000,
    startAt: new Date('2026-04-15T10:00:00Z'),
    checkedOutAt: new Date('2026-04-15T11:00:00Z'),
    totalDuration: 60,
    clientId: UUID_CLIENT,
    specialistId: UUID_SPEC,
    client: { firstName: 'Анна', lastName: 'Иванова' },
    specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
    services: [{ service: { name: 'Маникюр', category: 'NAIL' }, price: 3000 }],
    ...overrides,
  };
}

function makeSpecialist(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_SPEC,
    status: 'ACTIVE',
    user: { firstName: 'Мария', lastName: 'Петрова' },
    appointments: [makeApt()],
    ...overrides,
  };
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('Executive routes – auth guard', () => {
  test('rejects unauthenticated requests', async () => {
    const req = new NextRequest('http://localhost/api/executive/intelligence');
    const res = await getIntelligence(req);
    expect(res.status).toBe(401);
  });

  test('rejects CLIENT role', async () => {
    const req = new NextRequest('http://localhost/api/executive/intelligence');
    req.headers.set('x-user-id', UUID_USER);
    req.headers.set('x-user-role', 'CLIENT');
    const res = await getIntelligence(req);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/executive/intelligence ─────────────────────────────────────────
describe('GET /api/executive/intelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const apt = makeApt();
    (mp.appointment.findMany as jest.Mock).mockResolvedValue([apt]);
    (mp.payment.findMany as jest.Mock).mockResolvedValue([
      { amount: 3000, provider: 'CASH', paidAt: new Date('2026-04-15T11:00:00Z') },
    ]);
    (mp.refund.findMany as jest.Mock).mockResolvedValue([]);
    (mp.expense.findMany as jest.Mock).mockResolvedValue([]);
    (mp.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: UUID_CLIENT,
        firstName: 'Анна',
        lastName: 'Иванова',
        createdAt: new Date('2026-01-01'),
        clientAppointments: [apt],
      },
    ]);
    (mp.specialist.findMany as jest.Mock).mockResolvedValue([makeSpecialist()]);
    (mp.inventoryItem.findMany as jest.Mock).mockResolvedValue([]);
    (mp.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
    (mp.stockMovement.aggregate as jest.Mock).mockResolvedValue({ _sum: { totalCost: 0 } });
  });

  test('returns 200 with health score', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence', { period: '30' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('health');
    expect(body.data.health).toHaveProperty('score');
    expect(body.data.health).toHaveProperty('grade');
  });

  test('health score is between 0 and 100', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    const body = await res.json();
    expect(body.data.health.score).toBeGreaterThanOrEqual(0);
    expect(body.data.health.score).toBeLessThanOrEqual(100);
  });

  test('returns revenue metrics', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    const body = await res.json();
    expect(body.data).toHaveProperty('revenue');
    expect(body.data.revenue).toHaveProperty('total');
  });

  test('returns bookings metrics', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    const body = await res.json();
    expect(body.data).toHaveProperty('bookings');
    expect(body.data.bookings).toHaveProperty('total');
    expect(body.data.bookings).toHaveProperty('completed');
  });

  test('returns specialist array', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    const body = await res.json();
    expect(body.data).toHaveProperty('specialists');
    expect(Array.isArray(body.data.specialists)).toBe(true);
  });

  test('returns daily series for charts', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    const body = await res.json();
    expect(body.data).toHaveProperty('dailySeries');
    expect(Array.isArray(body.data.dailySeries)).toBe(true);
  });

  test('returns risks array', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    const body = await res.json();
    expect(body.data).toHaveProperty('risks');
    expect(Array.isArray(body.data.risks)).toBe(true);
  });

  test('returns briefing object', async () => {
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    const body = await res.json();
    expect(body.data).toHaveProperty('briefing');
  });

  test('handles empty data gracefully — no exceptions', async () => {
    (mp.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (mp.payment.findMany as jest.Mock).mockResolvedValue([]);
    (mp.specialist.findMany as jest.Mock).mockResolvedValue([]);
    (mp.user.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getIntelligence(adminReq('/api/executive/intelligence'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── GET /api/executive/forecast ─────────────────────────────────────────────
describe('GET /api/executive/forecast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const apt = makeApt();
    (mp.appointment.findMany as jest.Mock).mockResolvedValue([apt]);
  });

  test('returns 200 with forecast array', async () => {
    const res = await getForecast(adminReq('/api/executive/forecast', { horizon: '14' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.forecast)).toBe(true);
  });

  test('forecast length matches horizon', async () => {
    const res = await getForecast(adminReq('/api/executive/forecast', { horizon: '7' }));
    const body = await res.json();
    expect(body.data.forecast).toHaveLength(7);
  });

  test('each forecast point has required fields', async () => {
    const res = await getForecast(adminReq('/api/executive/forecast', { horizon: '7' }));
    const body = await res.json();
    const point = body.data.forecast[0];
    expect(point).toHaveProperty('date');
    expect(point).toHaveProperty('forecastRevenue');
    expect(point).toHaveProperty('low');
    expect(point).toHaveProperty('high');
    expect(point).toHaveProperty('confidence');
  });

  test('forecast revenue is non-negative', async () => {
    const res = await getForecast(adminReq('/api/executive/forecast', { horizon: '7' }));
    const body = await res.json();
    for (const p of body.data.forecast) {
      expect(p.forecastRevenue).toBeGreaterThanOrEqual(0);
      expect(p.low).toBeGreaterThanOrEqual(0);
    }
  });

  test('returns dowDemand heatmap (7 days)', async () => {
    const res = await getForecast(adminReq('/api/executive/forecast'));
    const body = await res.json();
    expect(body.data.dowDemand).toHaveLength(7);
  });

  test('returns trend field', async () => {
    const res = await getForecast(adminReq('/api/executive/forecast'));
    const body = await res.json();
    expect(['up', 'down', 'stable']).toContain(body.data.trend);
  });

  test('handles empty appointments gracefully', async () => {
    (mp.appointment.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getForecast(adminReq('/api/executive/forecast'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.forecast.every((p: { forecastRevenue: number }) => p.forecastRevenue === 0)).toBe(true);
  });

  test('clamps horizon to max 90', async () => {
    const res = await getForecast(adminReq('/api/executive/forecast', { horizon: '200' }));
    const body = await res.json();
    expect(body.data.forecast.length).toBeLessThanOrEqual(90);
  });
});

// ─── GET /api/executive/risks ────────────────────────────────────────────────
describe('GET /api/executive/risks', () => {
  function seedRisks(cancelRate: number, total: number) {
    const cancelled = Math.round(total * cancelRate);
    const completed = total - cancelled;
    const apts = [
      ...Array(cancelled).fill(null).map((_, i) => ({
        id: `c-${i}`, status: 'CANCELLED', specialistId: UUID_SPEC, clientId: UUID_CLIENT,
      })),
      ...Array(completed).fill(null).map((_, i) => ({
        id: `ok-${i}`, status: 'COMPLETED', specialistId: UUID_SPEC, clientId: UUID_CLIENT,
      })),
    ];
    (mp.appointment.findMany as jest.Mock).mockResolvedValue(apts);
    (mp.payment.findMany as jest.Mock).mockResolvedValue([
      { amount: 10000, provider: 'CASH', paidAt: new Date() },
    ]);
    (mp.refund.findMany as jest.Mock).mockResolvedValue([]);
    (mp.expense.findMany as jest.Mock).mockResolvedValue([]);
    (mp.inventoryItem.findMany as jest.Mock).mockResolvedValue([]);
    (mp.specialist.findMany as jest.Mock).mockResolvedValue([]);
  }

  beforeEach(() => jest.clearAllMocks());

  test('returns 200 with risks array and summary', async () => {
    seedRisks(0.1, 20);
    const res = await getRisks(adminReq('/api/executive/risks'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.risks)).toBe(true);
    expect(body.data).toHaveProperty('summary');
  });

  test('detects HIGH cancellation spike when rate >25%', async () => {
    seedRisks(0.3, 20);
    const res = await getRisks(adminReq('/api/executive/risks'));
    const body = await res.json();
    const spike = body.data.risks.find((r: { code: string }) => r.code === 'CANCELLATION_SPIKE');
    expect(spike).toBeDefined();
    expect(spike.severity).toBe('HIGH');
  });

  test('detects MEDIUM cancellation when rate 15-25%', async () => {
    seedRisks(0.2, 20);
    const res = await getRisks(adminReq('/api/executive/risks'));
    const body = await res.json();
    const elevated = body.data.risks.find((r: { code: string }) => r.code === 'CANCELLATION_ELEVATED');
    expect(elevated).toBeDefined();
    expect(elevated.severity).toBe('MEDIUM');
  });

  test('no cancellation risk when rate is low', async () => {
    seedRisks(0.05, 20);
    const res = await getRisks(adminReq('/api/executive/risks'));
    const body = await res.json();
    const cancRisks = body.data.risks.filter((r: { category: string }) => r.category === 'BOOKINGS');
    expect(cancRisks).toHaveLength(0);
  });

  test('detects OUT_OF_STOCK when currentStock is 0', async () => {
    seedRisks(0.05, 10);
    (mp.inventoryItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'inv-1', name: 'Базовое покрытие', currentStock: 0, minStock: 5, unit: 'шт', expiresAt: null },
    ]);
    const res = await getRisks(adminReq('/api/executive/risks'));
    const body = await res.json();
    const oos = body.data.risks.find((r: { code: string }) => r.code === 'OUT_OF_STOCK');
    expect(oos).toBeDefined();
    expect(oos.severity).toBe('HIGH');
  });

  test('detects EXPIRING_SOON when expiresAt is within 14 days', async () => {
    seedRisks(0.05, 10);
    const soon = new Date(Date.now() + 7 * 86_400_000);
    (mp.inventoryItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'inv-2', name: 'Топ гель', currentStock: 10, minStock: 2, unit: 'шт', expiresAt: soon },
    ]);
    const res = await getRisks(adminReq('/api/executive/risks'));
    const body = await res.json();
    const expiring = body.data.risks.find((r: { code: string }) => r.code === 'EXPIRING_SOON');
    expect(expiring).toBeDefined();
  });

  test('summary counts HIGH/MEDIUM/LOW correctly', async () => {
    seedRisks(0.3, 20); // triggers HIGH CANCELLATION_SPIKE
    const res = await getRisks(adminReq('/api/executive/risks'));
    const body = await res.json();
    const { summary } = body.data;
    expect(summary.total).toBe(summary.high + summary.medium + summary.low);
  });

  test('risks are sorted HIGH first', async () => {
    seedRisks(0.3, 20);
    const res = await getRisks(adminReq('/api/executive/risks'));
    const body = await res.json();
    const severities = body.data.risks.map((r: { severity: string }) => r.severity);
    const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]]);
    }
  });
});

// ─── GET /api/executive/retention ────────────────────────────────────────────
describe('GET /api/executive/retention', () => {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  function makeClient(overrides: Partial<{
    id: string;
    apts: { id: string; startAt: Date; totalPrice: number; paidAmount: number; specialistId: string; specialist: { user: { firstName: string; lastName: string } } }[];
  }> = {}) {
    return {
      id: UUID_CLIENT,
      firstName: 'Анна',
      lastName: 'Иванова',
      createdAt: daysAgo(200),
      clientAppointments: overrides.apts ?? [
        {
          id: UUID_APT,
          startAt: daysAgo(10),
          totalPrice: 3000,
          paidAmount: 3000,
          specialistId: UUID_SPEC,
          specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
        },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (mp.user.findMany as jest.Mock).mockResolvedValue([makeClient()]);
    (mp.appointment.findMany as jest.Mock).mockResolvedValue([]);
  });

  test('returns 200 with summary and segments', async () => {
    const res = await getRetention(adminReq('/api/executive/retention', { period: '90' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('summary');
    expect(body.data).toHaveProperty('segments');
  });

  test('segments contain vips, atRisk, inactive, newClients arrays', async () => {
    const res = await getRetention(adminReq('/api/executive/retention'));
    const body = await res.json();
    const { segments } = body.data;
    expect(Array.isArray(segments.vips)).toBe(true);
    expect(Array.isArray(segments.atRisk)).toBe(true);
    expect(Array.isArray(segments.inactive)).toBe(true);
    expect(Array.isArray(segments.newClients)).toBe(true);
  });

  test('client with 3+ visits and 10000+ spend is classified as VIP', async () => {
    const period = 90;
    const vipApts = Array(5).fill(null).map((_, i) => ({
      id: `apt-${i}`,
      startAt: daysAgo(i * 5 + 1),
      totalPrice: 5000,
      paidAmount: 5000,
      specialistId: UUID_SPEC,
      specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
    }));
    (mp.user.findMany as jest.Mock).mockResolvedValue([makeClient({ apts: vipApts })]);
    const res = await getRetention(adminReq('/api/executive/retention', { period: String(period) }));
    const body = await res.json();
    expect(body.data.segments.vips.length).toBeGreaterThan(0);
  });

  test('inactive client has daysSince >= 90', async () => {
    const inactiveApts = [
      {
        id: 'old-apt',
        startAt: daysAgo(120),
        totalPrice: 2000,
        paidAmount: 2000,
        specialistId: UUID_SPEC,
        specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
      },
    ];
    (mp.user.findMany as jest.Mock).mockResolvedValue([makeClient({ apts: inactiveApts })]);
    const res = await getRetention(adminReq('/api/executive/retention'));
    const body = await res.json();
    const inactiveList = body.data.segments.inactive;
    for (const c of inactiveList) expect(c.daysSince).toBeGreaterThanOrEqual(90);
  });

  test('return probability is between 0 and 100', async () => {
    const vipApts = Array(5).fill(null).map((_, i) => ({
      id: `apt-${i}`,
      startAt: daysAgo(i * 10 + 1),
      totalPrice: 4000,
      paidAmount: 4000,
      specialistId: UUID_SPEC,
      specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
    }));
    (mp.user.findMany as jest.Mock).mockResolvedValue([makeClient({ apts: vipApts })]);
    const res = await getRetention(adminReq('/api/executive/retention', { period: '180' }));
    const body = await res.json();
    for (const seg of ['vips', 'atRisk'] as const) {
      for (const c of body.data.segments[seg]) {
        expect(c.returnProbability).toBeGreaterThanOrEqual(0);
        expect(c.returnProbability).toBeLessThanOrEqual(100);
      }
    }
  });

  test('returns retentionTrend array', async () => {
    const res = await getRetention(adminReq('/api/executive/retention'));
    const body = await res.json();
    expect(Array.isArray(body.data.retentionTrend)).toBe(true);
  });

  test('handles empty client list gracefully', async () => {
    (mp.user.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getRetention(adminReq('/api/executive/retention'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.summary.totalActiveClients).toBe(0);
  });
});

// ─── GET /api/executive/export ────────────────────────────────────────────────
describe('GET /api/executive/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const apt = makeApt();
    (mp.appointment.findMany as jest.Mock).mockResolvedValue([apt]);
    (mp.payment.findMany as jest.Mock).mockResolvedValue([
      { amount: 3000, provider: 'CASH', paidAt: new Date() },
    ]);
    (mp.refund.findMany as jest.Mock).mockResolvedValue([]);
    (mp.expense.findMany as jest.Mock).mockResolvedValue([]);
    (mp.specialist.findMany as jest.Mock).mockResolvedValue([makeSpecialist()]);
  });

  test('returns 200 with xlsx content-type', async () => {
    const res = await getExport(adminReq('/api/executive/export', { period: '30' }));
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('spreadsheetml');
  });

  test('filename includes period and date', async () => {
    const res = await getExport(adminReq('/api/executive/export', { period: '30' }));
    const cd = res.headers.get('content-disposition') ?? '';
    expect(cd).toMatch(/executive_report_30d/);
  });

  test('handles empty data without throwing', async () => {
    (mp.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (mp.payment.findMany as jest.Mock).mockResolvedValue([]);
    (mp.specialist.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getExport(adminReq('/api/executive/export'));
    expect(res.status).toBe(200);
  });
});
