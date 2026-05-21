/**
 * Integration test — GET /api/specialists/:id (detail endpoint).
 *
 * BUG-002: The detail endpoint returns a weaker shape than the list endpoint.
 * Missing fields: userId, sortOrder, createdAt, specialistType, allowedServiceIds.
 *
 * Tests are structured as:
 *   ✓  Baseline: returns 200 with correct id
 *   ✓  Returns 500 when specialist not found (findUniqueOrThrow throws)
 *   ✗  BUG-002: key set must match GET /api/specialists list item    ← FAILS before fix
 *   ✗  BUG-002: field values must match list item for same data      ← FAILS before fix
 */

import { NextRequest } from 'next/server';
import { GET as getDetail } from '@/app/api/specialists/[id]/route';
import { GET as getList } from '@/app/api/specialists/route';
import { makeSpecialistUser, makeSpecialistRow, resetFactoryCounter } from '../factories/specialist.factory';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockSpecialistFindMany          = jest.fn();
const mockSpecialistCount             = jest.fn();
const mockSpecialistFindUniqueOrThrow = jest.fn();

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    specialist: {
      findMany:          (...a: unknown[]) => mockSpecialistFindMany(...a),
      count:             (...a: unknown[]) => mockSpecialistCount(...a),
      findUniqueOrThrow: (...a: unknown[]) => mockSpecialistFindUniqueOrThrow(...a),
    },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detailReq(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/specialists/${id}`);
}

function listReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/specialists');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  resetFactoryCounter();
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('GET /api/specialists/:id — basic contract', () => {
  it('returns 200 with the correct id and core fields', async () => {
    const user = makeSpecialistUser();
    const specialist = makeSpecialistRow(user.id, {
      firstName: user.firstName, lastName: user.lastName, email: user.email,
    });

    mockSpecialistFindUniqueOrThrow.mockResolvedValueOnce({
      ...specialist,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email },
      services: [],
    });

    const res  = await getDetail(detailReq(specialist.id), { params: { id: specialist.id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(specialist.id);
    expect(json.data.firstName).toBe(user.firstName);
    expect(json.data.email).toBe(user.email);
  });

  it('returns 500 when the specialist does not exist', async () => {
    mockSpecialistFindUniqueOrThrow.mockRejectedValueOnce(new Error('No Specialist found'));

    const res = await getDetail(detailReq('00000000-0000-0000-0000-000000000000'), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('INTERNAL_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-002 — Shape parity with list endpoint
//
// GET /api/specialists/:id should return the same field structure as
// GET /api/specialists list items. Currently the detail endpoint is missing:
//   • userId
//   • sortOrder
//   • createdAt
//   • specialistType
//   • allowedServiceIds
//
// These two tests FAIL before the fix and pass after.
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/specialists/:id — BUG-002 shape parity (FAILS before fix)', () => {
  it('detail response has the same keys as a list item', async () => {
    const user = makeSpecialistUser();
    const specialist = makeSpecialistRow(user.id, {
      firstName: user.firstName, lastName: user.lastName, email: user.email,
    });
    const dbRow = {
      ...specialist,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email },
      services: [],
    };

    // Detail call
    mockSpecialistFindUniqueOrThrow.mockResolvedValueOnce(dbRow);
    const detailRes  = await getDetail(detailReq(specialist.id), { params: { id: specialist.id } });
    const detailJson = await detailRes.json();
    expect(detailRes.status).toBe(200);

    // List call — same underlying row
    mockSpecialistFindMany.mockResolvedValueOnce([dbRow]);
    mockSpecialistCount.mockResolvedValueOnce(1);
    const listRes  = await getList(listReq());
    const listJson = await listRes.json();
    expect(listRes.status).toBe(200);

    const detailKeys = Object.keys(detailJson.data as Record<string, unknown>).sort();
    const listKeys   = Object.keys((listJson.data.items as Record<string, unknown>[])[0]).sort();

    // WILL FAIL before fix — detail missing: allowedServiceIds, createdAt, sortOrder, specialistType, userId
    expect(detailKeys).toEqual(listKeys);
  });

  it('detail response field values match list item for the same specialist', async () => {
    const user = makeSpecialistUser();
    const specialist = makeSpecialistRow(user.id, {
      firstName: user.firstName, lastName: user.lastName, email: user.email,
    });
    const dbRow = {
      ...specialist,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email },
      services: [],
    };

    // Detail call
    mockSpecialistFindUniqueOrThrow.mockResolvedValueOnce(dbRow);
    const detailRes  = await getDetail(detailReq(specialist.id), { params: { id: specialist.id } });
    const detailData = (await detailRes.json()).data as Record<string, unknown>;
    expect(detailRes.status).toBe(200);

    // List call
    mockSpecialistFindMany.mockResolvedValueOnce([dbRow]);
    mockSpecialistCount.mockResolvedValueOnce(1);
    const listRes  = await getList(listReq());
    const listItem = ((await listRes.json()).data.items as Record<string, unknown>[])[0];
    expect(listRes.status).toBe(200);

    // Strip timestamps before deep comparison
    const { createdAt: _dtc, ...detailRest } = detailData;
    const { createdAt: _ltc, ...listRest   } = listItem;

    // WILL FAIL before fix — detail fields are a strict subset of list fields
    expect(detailRest).toEqual(listRest);
  });
});
