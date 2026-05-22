/**
 * Integration tests — Financial / Profitability Analytics (Phase B5).
 *
 * Tests:
 *   GET /api/analytics/financial/revenue
 *   GET /api/analytics/financial/peak-hours
 *   GET /api/analytics/financial/forecast
 *
 * Prisma is fully mocked — no database needed.
 */

import { NextRequest } from 'next/server';
import { GET as getRevenue } from '@/app/api/analytics/financial/revenue/route';
import { GET as getPeakHours } from '@/app/api/analytics/financial/peak-hours/route';
import { GET as getForecast } from '@/app/api/analytics/financial/forecast/route';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockAppointmentFindMany  = jest.fn();
const mockAppointmentAggregate = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    appointment: {
      findMany:  (...a: unknown[]) => mockAppointmentFindMany(...a),
      aggregate: (...a: unknown[]) => mockAppointmentAggregate(...a),
    },
  },
}));

// ─── Seed helpers ─────────────────────────────────────────────────────────────

function makeApt(
  totalPrice: number,
  startAt: Date,
  specialization = 'Косметолог',
  services: { price: number; category: string }[] = [],
) {
  return {
    totalPrice: { toNumber: () => totalPrice },
    startAt,
    specialist: { specialization },
    services: services.map(s => ({
      price: { toNumber: () => s.price },
      service: { category: s.category },
    })),
  };
}

// Monday 10:00 in Europe/Moscow = 07:00 UTC (UTC+3)
const MON_10 = new Date('2026-05-18T07:00:00Z'); // Monday
const MON_14 = new Date('2026-05-18T11:00:00Z'); // Monday 14:00 Moscow
const TUE_10 = new Date('2026-05-19T07:00:00Z'); // Tuesday 10:00 Moscow
const WED_10 = new Date('2026-05-20T07:00:00Z'); // Wednesday

// ─── Request helpers ──────────────────────────────────────────────────────────

function adminReq(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'ADMIN' },
  });
}

function anonReq(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

function clientReq(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { 'x-user-id': 'usr-c', 'x-user-role': 'CLIENT' },
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/financial/revenue
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/analytics/financial/revenue', () => {
  function setupRevenueMocks(apts: ReturnType<typeof makeApt>[], prevTotal = 0) {
    mockAppointmentFindMany.mockResolvedValueOnce(apts);
    mockAppointmentAggregate.mockResolvedValueOnce({
      _sum: { totalPrice: prevTotal > 0 ? { toNumber: () => prevTotal } : null },
    });
  }

  it('returns correct FinancialRevenueResponse shape', async () => {
    setupRevenueMocks([]);

    const res = await getRevenue(adminReq('/api/analytics/financial/revenue'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    expect(d).toHaveProperty('period');
    expect(d.period).toHaveProperty('from');
    expect(d.period).toHaveProperty('to');
    expect(d).toHaveProperty('total');
    expect(d).toHaveProperty('byCategory');
    expect(d).toHaveProperty('bySpecialistType');
    expect(d).toHaveProperty('byDay');
    expect(d).toHaveProperty('trend');
    expect(d.trend).toHaveProperty('vsLastPeriod');
    expect(d).toHaveProperty('avgTicket');
    expect(d).toHaveProperty('topEarningDay');
  });

  it('total = sum of all completed appointment prices', async () => {
    const apts = [
      makeApt(3000, MON_10),
      makeApt(5000, TUE_10),
      makeApt(2500, WED_10),
    ];
    setupRevenueMocks(apts);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { total: number };
    };

    expect(data.total).toBe(10500);
  });

  it('byCategory correctly splits revenue by service category', async () => {
    const apts = [
      makeApt(3000, MON_10, 'Косметолог', [
        { price: 1500, category: 'MASSAGE' },
        { price: 1500, category: 'COSMETOLOGY' },
      ]),
      makeApt(2000, TUE_10, 'Косметолог', [
        { price: 2000, category: 'MASSAGE' },
      ]),
    ];
    setupRevenueMocks(apts);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { byCategory: { category: string; revenue: number; sessionCount: number }[] };
    };

    const massage = data.byCategory.find(c => c.category === 'MASSAGE');
    const cosmo = data.byCategory.find(c => c.category === 'COSMETOLOGY');
    expect(massage?.revenue).toBe(3500);
    expect(massage?.sessionCount).toBe(2);
    expect(cosmo?.revenue).toBe(1500);
    expect(cosmo?.sessionCount).toBe(1);
  });

  it('byCategory entries are sorted by revenue descending', async () => {
    const apts = [
      makeApt(1000, MON_10, 'Косметолог', [
        { price: 1000, category: 'FACIAL' },
        { price: 3000, category: 'LASER' },
      ]),
    ];
    setupRevenueMocks(apts);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { byCategory: { category: string; revenue: number }[] };
    };

    expect(data.byCategory[0].revenue).toBeGreaterThanOrEqual(data.byCategory[1]?.revenue ?? 0);
  });

  it('byCategory avgTicket = revenue / sessionCount', async () => {
    const apts = [
      makeApt(2000, MON_10, 'Косметолог', [
        { price: 1000, category: 'MASSAGE' },
        { price: 1000, category: 'MASSAGE' },
      ]),
    ];
    setupRevenueMocks(apts);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { byCategory: { category: string; avgTicket: number; sessionCount: number }[] };
    };

    const massage = data.byCategory.find(c => c.category === 'MASSAGE');
    expect(massage?.avgTicket).toBe(1000); // 2000 / 2
  });

  it('bySpecialistType splits MASSAGE vs COSMETOLOGY correctly', async () => {
    const apts = [
      makeApt(3000, MON_10, 'Массажист SPA'),   // MASSAGE
      makeApt(5000, TUE_10, 'Косметолог'),       // COSMETOLOGY
      makeApt(2000, WED_10, 'массажист Thai'),   // MASSAGE
    ];
    setupRevenueMocks(apts);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { bySpecialistType: { specialistType: string; revenue: number; sessionCount: number }[] };
    };

    const massage = data.bySpecialistType.find(t => t.specialistType === 'MASSAGE');
    const cosmo = data.bySpecialistType.find(t => t.specialistType === 'COSMETOLOGY');
    expect(massage?.revenue).toBe(5000);
    expect(massage?.sessionCount).toBe(2);
    expect(cosmo?.revenue).toBe(5000);
    expect(cosmo?.sessionCount).toBe(1);
  });

  it('byDay has one entry per day in the requested period', async () => {
    setupRevenueMocks([]);

    const req = new NextRequest('http://localhost:3000/api/analytics/financial/revenue?from=2026-05-01&to=2026-05-08', {
      headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'ADMIN' },
    });
    const { data } = (await (await getRevenue(req)).json()) as {
      data: { byDay: unknown[] };
    };

    expect(data.byDay).toHaveLength(7); // May 1-7
  });

  it('byDay entries are zero-filled for days with no appointments', async () => {
    setupRevenueMocks([]); // no appointments

    const req = new NextRequest('http://localhost:3000/api/analytics/financial/revenue?from=2026-05-01&to=2026-05-04', {
      headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'ADMIN' },
    });
    const { data } = (await (await getRevenue(req)).json()) as {
      data: { byDay: { revenue: number; sessionCount: number }[] };
    };

    expect(data.byDay.every(d => d.revenue === 0 && d.sessionCount === 0)).toBe(true);
  });

  it('avgTicket = total / sessionCount', async () => {
    const apts = [
      makeApt(3000, MON_10),
      makeApt(5000, TUE_10),
    ];
    setupRevenueMocks(apts);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { avgTicket: number; total: number };
    };

    expect(data.avgTicket).toBe(4000); // 8000 / 2
  });

  it('avgTicket = 0 when no sessions', async () => {
    setupRevenueMocks([]);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { avgTicket: number };
    };

    expect(data.avgTicket).toBe(0);
  });

  it('topEarningDay returns the date with the highest revenue', async () => {
    const apts = [
      makeApt(1000, MON_10),
      makeApt(5000, TUE_10), // highest
      makeApt(2000, WED_10),
    ];
    setupRevenueMocks(apts);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { topEarningDay: { date: string; revenue: number } | null };
    };

    expect(data.topEarningDay).not.toBeNull();
    expect(data.topEarningDay?.revenue).toBe(5000);
  });

  it('topEarningDay = null when no revenue', async () => {
    setupRevenueMocks([]);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { topEarningDay: null };
    };

    expect(data.topEarningDay).toBeNull();
  });

  it('trend.vsLastPeriod returns 0 when previous period had 0 revenue', async () => {
    setupRevenueMocks([makeApt(5000, MON_10)], 0);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { trend: { vsLastPeriod: number } };
    };

    expect(data.trend.vsLastPeriod).toBe(0);
  });

  it('trend.vsLastPeriod calculates correct percentage', async () => {
    setupRevenueMocks([makeApt(12000, MON_10)], 10000);

    const { data } = (await (await getRevenue(adminReq('/api/analytics/financial/revenue'))).json()) as {
      data: { trend: { vsLastPeriod: number } };
    };

    expect(data.trend.vsLastPeriod).toBe(20); // (12000-10000)/10000*100
  });

  it('returns 401 without auth headers', async () => {
    const res = await getRevenue(anonReq('/api/analytics/financial/revenue'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for CLIENT role', async () => {
    const res = await getRevenue(clientReq('/api/analytics/financial/revenue'));
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/financial/peak-hours
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/analytics/financial/peak-hours', () => {
  it('returns correct PeakHoursResponse shape', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const res = await getPeakHours(adminReq('/api/analytics/financial/peak-hours'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    expect(d).toHaveProperty('period');
    expect(d).toHaveProperty('heatmap');
    expect(Array.isArray(d.heatmap)).toBe(true);
    expect(d).toHaveProperty('peakHour');
    expect(d).toHaveProperty('peakDay');
  });

  it('heatmap entry has dayOfWeek, hour, bookingCount, revenue fields', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([
      { startAt: MON_10, totalPrice: { toNumber: () => 3000 } },
    ]);

    const { data } = (await (await getPeakHours(adminReq('/api/analytics/financial/peak-hours'))).json()) as {
      data: { heatmap: Record<string, unknown>[] };
    };

    expect(data.heatmap).toHaveLength(1);
    const cell = data.heatmap[0];
    expect(cell).toHaveProperty('dayOfWeek');
    expect(cell).toHaveProperty('hour');
    expect(cell).toHaveProperty('bookingCount');
    expect(cell).toHaveProperty('revenue');
  });

  it('accumulates bookingCount for same dayOfWeek + hour', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([
      { startAt: MON_10, totalPrice: { toNumber: () => 3000 } },
      { startAt: MON_10, totalPrice: { toNumber: () => 2000 } }, // same slot
    ]);

    const { data } = (await (await getPeakHours(adminReq('/api/analytics/financial/peak-hours'))).json()) as {
      data: { heatmap: { dayOfWeek: number; hour: number; bookingCount: number; revenue: number }[] };
    };

    expect(data.heatmap).toHaveLength(1); // one unique slot
    expect(data.heatmap[0].bookingCount).toBe(2);
    expect(data.heatmap[0].revenue).toBe(5000);
  });

  it('different hours produce separate heatmap cells', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([
      { startAt: MON_10, totalPrice: { toNumber: () => 3000 } },   // Mon 10:00
      { startAt: MON_14, totalPrice: { toNumber: () => 2000 } },   // Mon 14:00
    ]);

    const { data } = (await (await getPeakHours(adminReq('/api/analytics/financial/peak-hours'))).json()) as {
      data: { heatmap: unknown[] };
    };

    expect(data.heatmap).toHaveLength(2);
  });

  it('peakHour is the cell with the highest bookingCount', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([
      { startAt: MON_10, totalPrice: { toNumber: () => 1000 } },
      { startAt: MON_10, totalPrice: { toNumber: () => 1000 } }, // Mon 10: 2 bookings
      { startAt: TUE_10, totalPrice: { toNumber: () => 1000 } }, // Tue 10: 1 booking
    ]);

    const { data } = (await (await getPeakHours(adminReq('/api/analytics/financial/peak-hours'))).json()) as {
      data: { peakHour: { dayOfWeek: number; hour: number; bookingCount: number } };
    };

    expect(data.peakHour.bookingCount).toBe(2);
  });

  it('peakDay is the dayOfWeek with highest total revenue', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([
      { startAt: MON_10, totalPrice: { toNumber: () => 1000 } },
      { startAt: MON_14, totalPrice: { toNumber: () => 2000 } }, // Mon total: 3000
      { startAt: TUE_10, totalPrice: { toNumber: () => 5000 } }, // Tue total: 5000 → peak
    ]);

    const { data } = (await (await getPeakHours(adminReq('/api/analytics/financial/peak-hours'))).json()) as {
      data: { peakDay: { dayOfWeek: number; totalRevenue: number } };
    };

    // TUE = dayOfWeek 1 in 0=Mon convention
    expect(data.peakDay.totalRevenue).toBe(5000);
  });

  it('peakHour = null and peakDay = null when no appointments', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getPeakHours(adminReq('/api/analytics/financial/peak-hours'))).json()) as {
      data: { peakHour: null; peakDay: null };
    };

    expect(data.peakHour).toBeNull();
    expect(data.peakDay).toBeNull();
  });

  it('returns 401 without auth headers', async () => {
    const res = await getPeakHours(anonReq('/api/analytics/financial/peak-hours'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for CLIENT role', async () => {
    const res = await getPeakHours(clientReq('/api/analytics/financial/peak-hours'));
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analytics/financial/forecast
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/analytics/financial/forecast', () => {
  it('returns correct FinancialForecastResponse shape', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const res = await getForecast(adminReq('/api/analytics/financial/forecast'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const d = json.data;
    expect(d).toHaveProperty('generatedAt');
    expect(d).toHaveProperty('historicalDays');
    expect(d).toHaveProperty('forecast');
    expect(d).toHaveProperty('rollingAvgRevenue');
    expect(d).toHaveProperty('trend');
  });

  it('historicalDays has exactly 30 entries', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { historicalDays: unknown[] };
    };

    expect(data.historicalDays).toHaveLength(30);
  });

  it('forecast has exactly 7 entries', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { forecast: unknown[] };
    };

    expect(data.forecast).toHaveLength(7);
  });

  it('each forecast entry has date, forecastedRevenue, confidence', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { forecast: Record<string, unknown>[] };
    };

    const point = data.forecast[0];
    expect(point).toHaveProperty('date');
    expect(point).toHaveProperty('forecastedRevenue');
    expect(point).toHaveProperty('confidence');
    expect(typeof point.date).toBe('string');
    expect(typeof point.forecastedRevenue).toBe('number');
    expect(['high', 'medium', 'low']).toContain(point.confidence);
  });

  it('forecastedRevenue = 0 when there is no historical data', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { forecast: { forecastedRevenue: number }[] };
    };

    expect(data.forecast.every(p => p.forecastedRevenue === 0)).toBe(true);
  });

  it('rollingAvgRevenue = 0 when no data', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { rollingAvgRevenue: number };
    };

    expect(data.rollingAvgRevenue).toBe(0);
  });

  it('rollingAvgRevenue = mean of last 7 days revenue', async () => {
    // Place appointments on today through 6 days ago (fills the last7 slice exactly)
    const now = new Date();
    const apts = Array.from({ length: 7 }, (_, i) => ({
      startAt: new Date(now.getTime() - i * 86_400_000),
      totalPrice: { toNumber: () => 1000 },
    }));
    mockAppointmentFindMany.mockResolvedValueOnce(apts);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { rollingAvgRevenue: number };
    };

    expect(data.rollingAvgRevenue).toBe(1000);
  });

  it('forecastedRevenue = rollingAvgRevenue (rounded) for each forecast day', async () => {
    const now = new Date();
    const apts = Array.from({ length: 7 }, (_, i) => ({
      startAt: new Date(now.getTime() - (i + 1) * 86_400_000),
      totalPrice: { toNumber: () => 5000 },
    }));
    mockAppointmentFindMany.mockResolvedValueOnce(apts);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { forecast: { forecastedRevenue: number }[]; rollingAvgRevenue: number };
    };

    expect(data.forecast.every(p => p.forecastedRevenue === Math.round(data.rollingAvgRevenue))).toBe(true);
  });

  it('trend = stable when last 7 days ≈ prior 7 days', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { trend: string };
    };

    // No data → no prior comparison → stable
    expect(data.trend).toBe('stable');
  });

  it('confidence values are valid', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { forecast: { confidence: string }[] };
    };

    const valid = ['high', 'medium', 'low'];
    data.forecast.forEach(p => expect(valid).toContain(p.confidence));
  });

  it('generatedAt is a valid ISO timestamp', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { generatedAt: string };
    };

    expect(() => new Date(data.generatedAt).toISOString()).not.toThrow();
  });

  it('historicalDays entries each have date, revenue, sessionCount', async () => {
    mockAppointmentFindMany.mockResolvedValueOnce([]);

    const { data } = (await (await getForecast(adminReq('/api/analytics/financial/forecast'))).json()) as {
      data: { historicalDays: Record<string, unknown>[] };
    };

    const day = data.historicalDays[0];
    expect(day).toHaveProperty('date');
    expect(day).toHaveProperty('revenue');
    expect(day).toHaveProperty('sessionCount');
  });

  it('returns 401 without auth headers', async () => {
    const res = await getForecast(anonReq('/api/analytics/financial/forecast'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for CLIENT role', async () => {
    const res = await getForecast(clientReq('/api/analytics/financial/forecast'));
    expect(res.status).toBe(403);
  });
});
