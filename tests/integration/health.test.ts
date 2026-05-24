/**
 * Integration test — GET /api/health
 *
 * BUG-005: Upgrade stub health endpoint to production-grade implementation.
 *
 * Tests:
 *   ✓  Always returns HTTP 200
 *   ✓  Response envelope: { success: true, data: { ... } }
 *   ✓  data.status is 'ok' when DB is reachable
 *   ✓  data.status is 'degraded' when DB is unreachable
 *   ✓  data.checks.database.latencyMs is a number when connected
 *   ✓  data.checks.database.latencyMs is null when disconnected
 *   ✓  data.timestamp is ISO 8601
 *   ✓  data.uptime is a non-negative number
 *   ✓  data.version is a non-empty string
 *   ✓  Cache-Control: no-store header is set
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockQueryRaw = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    $queryRaw: (...a: unknown[]) => mockQueryRaw(...a),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function healthReq(): NextRequest {
  return new NextRequest('http://localhost:3000/api/health');
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('GET /api/health — always HTTP 200', () => {
  it('returns 200 when DB is reachable', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await GET(healthReq());
    expect(res.status).toBe(200);
  });

  it('returns 200 even when DB is unreachable', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('connection refused'));

    const res = await GET(healthReq());
    expect(res.status).toBe(200);
  });
});

describe('GET /api/health — response envelope', () => {
  it('wraps data in { success: true, data }', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const res  = await GET(healthReq());
    const json = await res.json() as { success: boolean; data: unknown };

    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });
});

describe('GET /api/health — database reachable', () => {
  it('data.status is "ok"', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const json = await (await GET(healthReq())).json() as {
      data: { status: string; checks: { database: { status: string; latencyMs: number | null } } };
    };

    expect(json.data.status).toBe('ok');
    expect(json.data.checks.database.status).toBe('connected');
  });

  it('data.checks.database.latencyMs is a non-negative number', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const json = await (await GET(healthReq())).json() as {
      data: { checks: { database: { latencyMs: number | null } } };
    };

    expect(typeof json.data.checks.database.latencyMs).toBe('number');
    expect(json.data.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /api/health — database unreachable', () => {
  it('data.status is "degraded"', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const json = await (await GET(healthReq())).json() as {
      data: { status: string; checks: { database: { status: string; latencyMs: number | null } } };
    };

    expect(json.data.status).toBe('degraded');
    expect(json.data.checks.database.status).toBe('disconnected');
  });

  it('data.checks.database.latencyMs is null', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const json = await (await GET(healthReq())).json() as {
      data: { checks: { database: { latencyMs: number | null } } };
    };

    expect(json.data.checks.database.latencyMs).toBeNull();
  });
});

describe('GET /api/health — metadata fields', () => {
  it('data.timestamp is a valid ISO 8601 string', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const json = await (await GET(healthReq())).json() as { data: { timestamp: string } };

    expect(typeof json.data.timestamp).toBe('string');
    expect(new Date(json.data.timestamp).toISOString()).toBe(json.data.timestamp);
  });

  it('data.uptime is a non-negative number', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const json = await (await GET(healthReq())).json() as { data: { uptime: number } };

    expect(typeof json.data.uptime).toBe('number');
    expect(json.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('data.version is a non-empty string', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const json = await (await GET(healthReq())).json() as { data: { version: string } };

    expect(typeof json.data.version).toBe('string');
    expect(json.data.version.length).toBeGreaterThan(0);
  });
});

describe('GET /api/health — Cache-Control header', () => {
  it('sets Cache-Control: no-store', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const res = await GET(healthReq());
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
