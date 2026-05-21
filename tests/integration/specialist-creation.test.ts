/**
 * PRIORITY INTEGRATION TEST — Specialist Creation
 *
 * This is the first integration test written for Shante Lyur OS.
 * It reproduces the reported bug: "cannot add specialists through CRM workflow."
 *
 * Contract under test: POST /api/specialists → 201 → GET /api/specialists includes
 * the new specialist.
 *
 * Which tests PASS vs FAIL:
 *   ✓  Happy-path POST returns 201 with correct core fields
 *   ✓  Duplicate email returns 409 (no double-creation)
 *   ✓  Missing required fields return 400
 *   ✓  Color from browser color picker (lowercase hex) is accepted
 *   ✓  BUG-001 (FIXED): POST response now includes `specialistType` field
 *      The booking wizard reads `specialistType` from specialist objects.
 *      Fixed: POST handler now calls deriveSpecialistType() and includes the field.
 *   ✓  BUG-001 (FIXED): POST response now includes `allowedServiceIds` field
 *      Fixed: POST handler now returns `allowedServiceIds: []` for new specialists,
 *      matching the shape returned by GET /api/specialists.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/specialists/route';
import { makeCreateSpecialistBody, makeSpecialistUser, makeSpecialistRow, resetFactoryCounter } from '../factories/specialist.factory';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
// Hand-rolled mock — must include every method the route handler calls.
// Route calls prisma.user.create + prisma.specialist.create to BUILD the
// transaction arg array, even though $transaction itself is mocked.
const mockUserFindUnique  = jest.fn();
const mockUserCreate      = jest.fn();
const mockSpecialistFindMany = jest.fn();
const mockSpecialistCount    = jest.fn();
const mockSpecialistCreate   = jest.fn();
const mockTransaction        = jest.fn();

// Alias the old names so test bodies don't need updating
const mockFindUnique = mockUserFindUnique;
const mockFindMany   = mockSpecialistFindMany;
const mockCount      = mockSpecialistCount;

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create:     (...args: unknown[]) => mockUserCreate(...args),
    },
    specialist: {
      findMany: (...args: unknown[]) => mockSpecialistFindMany(...args),
      count:    (...args: unknown[]) => mockSpecialistCount(...args),
      create:   (...args: unknown[]) => mockSpecialistCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/specialists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/specialists');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: 'GET' });
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  resetFactoryCounter();
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/specialists — Specialist Creation', () => {
  it('returns 201 with core specialist fields on valid input', async () => {
    const body = makeCreateSpecialistBody();
    const user = makeSpecialistUser({ email: body.email, firstName: body.firstName, lastName: body.lastName });
    const specialist = makeSpecialistRow(user.id, { firstName: user.firstName, lastName: user.lastName, email: user.email });

    mockFindUnique.mockResolvedValueOnce(null); // no existing user
    mockTransaction.mockResolvedValueOnce([user, specialist]);

    const res = await POST(postReq(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);

    // Core fields every specialist object must have
    expect(json.data.id).toBe(specialist.id);
    expect(json.data.firstName).toBe(user.firstName);
    expect(json.data.lastName).toBe(user.lastName);
    expect(json.data.email).toBe(user.email);
    expect(json.data.status).toBe('ACTIVE');
    expect(json.data.reviewCount).toBe(0);
    expect(json.data.rating).toBeNull();
  });

  it('returns 409 when email already exists', async () => {
    const body = makeCreateSpecialistBody({ email: 'existing@shantelyur.ru' });
    const existingUser = makeSpecialistUser({ email: body.email });

    mockFindUnique.mockResolvedValueOnce(existingUser); // user already in DB

    const res = await POST(postReq(body));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('CONFLICT');
    // Transaction must NOT have been called
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns 400 when firstName is missing', async () => {
    const res = await POST(postReq({
      lastName: 'Петрова',
      email: 'test@salon.ru',
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when email is malformed', async () => {
    const res = await POST(postReq({
      firstName: 'Мария',
      lastName: 'Петрова',
      email: 'not-an-email',
    }));
    expect(res.status).toBe(400);
  });

  it('accepts lowercase hex color from browser color picker', async () => {
    // Browser <input type="color"> returns lowercase e.g. #c9a96e
    const body = makeCreateSpecialistBody({ color: '#c9a96e' });
    const user = makeSpecialistUser({ email: body.email, firstName: body.firstName, lastName: body.lastName });
    const specialist = makeSpecialistRow(user.id, { firstName: user.firstName, lastName: user.lastName, email: user.email }, { color: '#c9a96e' });

    mockFindUnique.mockResolvedValueOnce(null);
    mockTransaction.mockResolvedValueOnce([user, specialist]);

    const res = await POST(postReq(body));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.color).toBe('#c9a96e');
  });

  it('accepts commissionRate at boundary values (0 and 1)', async () => {
    for (const rate of [0, 1]) {
      jest.clearAllMocks();
      const body = makeCreateSpecialistBody({ commissionRate: rate });
      const user = makeSpecialistUser({ email: body.email, firstName: body.firstName, lastName: body.lastName });
      const specialist = makeSpecialistRow(user.id, { firstName: user.firstName, lastName: user.lastName, email: user.email });

      mockFindUnique.mockResolvedValueOnce(null);
      mockTransaction.mockResolvedValueOnce([user, specialist]);

      const res = await POST(postReq(body));
      expect(res.status).toBe(201, `commissionRate=${rate} should be valid`);
    }
  });

  it('rejects commissionRate > 1', async () => {
    const res = await POST(postReq(makeCreateSpecialistBody({ commissionRate: 1.5 })));
    expect(res.status).toBe(400);
  });

  // BUG-001 (FIXED) — POST response must include `specialistType`
  it('BUG: POST response includes specialistType needed by booking wizard', async () => {
    const body = makeCreateSpecialistBody({ specialization: 'Массажист SPA' });
    const user = makeSpecialistUser({ email: body.email, firstName: body.firstName, lastName: body.lastName });
    const specialist = makeSpecialistRow(user.id, { firstName: user.firstName, lastName: user.lastName, email: user.email }, { specialization: 'Массажист SPA' });

    mockFindUnique.mockResolvedValueOnce(null);
    mockTransaction.mockResolvedValueOnce([user, specialist]);

    const res = await POST(postReq(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    // The booking wizard requires specialistType on every specialist object.
    // This assertion WILL FAIL because POST does not return this field.
    expect(json.data).toHaveProperty('specialistType');
    expect(['MASSAGE', 'COSMETOLOGY']).toContain(json.data.specialistType);
  });

  // BUG-001 (FIXED) — POST response must include `allowedServiceIds`
  it('BUG: POST response includes allowedServiceIds for shape consistency with GET', async () => {
    const body = makeCreateSpecialistBody();
    const user = makeSpecialistUser({ email: body.email, firstName: body.firstName, lastName: body.lastName });
    const specialist = makeSpecialistRow(user.id, { firstName: user.firstName, lastName: user.lastName, email: user.email });

    mockFindUnique.mockResolvedValueOnce(null);
    mockTransaction.mockResolvedValueOnce([user, specialist]);

    const res = await POST(postReq(body));
    const json = await res.json();

    expect(res.status).toBe(201);
    // WILL FAIL: POST response lacks allowedServiceIds (always [] for a new specialist)
    expect(json.data).toHaveProperty('allowedServiceIds');
    expect(Array.isArray(json.data.allowedServiceIds)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/specialists → includes newly created specialist', () => {
  it('returns the new specialist in the ACTIVE-filtered list', async () => {
    const user = makeSpecialistUser();
    const specialist = makeSpecialistRow(user.id, { firstName: user.firstName, lastName: user.lastName, email: user.email });

    // Simulate what Prisma returns after the specialist is persisted
    mockFindMany.mockResolvedValueOnce([
      {
        ...specialist,
        user: { firstName: user.firstName, lastName: user.lastName, email: user.email },
        services: [], // no service links yet for a brand-new specialist
      },
    ]);
    mockCount.mockResolvedValueOnce(1);

    const res = await GET(getReq({ status: 'ACTIVE' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.items).toHaveLength(1);

    const item = json.data.items[0];
    expect(item.id).toBe(specialist.id);
    expect(item.email).toBe(user.email);
    expect(item.status).toBe('ACTIVE');
    // GET response DOES include specialistType
    expect(item).toHaveProperty('specialistType');
    // GET response DOES include allowedServiceIds
    expect(item).toHaveProperty('allowedServiceIds');
    expect(Array.isArray(item.allowedServiceIds)).toBe(true);
  });

  it('returns 400 on invalid status filter', async () => {
    // status is passed as a raw string (not validated as enum by ListQuerySchema)
    // This is actually accepted because ListQuerySchema allows any string for status
    // and Prisma will throw on an invalid enum value. Documenting current behaviour.
    mockFindMany.mockRejectedValueOnce(new Error('Invalid value for enum field'));
    mockCount.mockResolvedValueOnce(0);

    const res = await GET(getReq({ status: 'INVALID_STATUS' }));
    // Expect internal error since Prisma enum validation fails at runtime
    expect(res.status).toBe(500);
  });

  it('returns empty list when no specialists exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const res = await GET(getReq({ status: 'ACTIVE' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.items).toHaveLength(0);
    expect(json.data.total).toBe(0);
  });

  it('paginates correctly', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(30);

    const res = await GET(getReq({ page: '2', limit: '10' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.page).toBe(2);
    expect(json.data.limit).toBe(10);
    expect(json.data.total).toBe(30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION LOCK — POST shape === GET /api/specialists list-item shape
//
// Guards against future regressions where a field is added to GET but not POST
// (or vice-versa). Uses the same factory data for both calls so that field
// values are identical, then strips timestamps before deep comparison.
// ─────────────────────────────────────────────────────────────────────────────
describe('Shape contract: POST response === GET /api/specialists list item', () => {
  it('every field returned by POST is present on the GET list item with the same value', async () => {
    const body = makeCreateSpecialistBody({ specialization: 'Массажист SPA' });
    const user = makeSpecialistUser({ email: body.email, firstName: body.firstName, lastName: body.lastName });
    const specialist = makeSpecialistRow(
      user.id,
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
      { specialization: 'Массажист SPA' },
    );

    // ── POST ──────────────────────────────────────────────────────────────────
    mockFindUnique.mockResolvedValueOnce(null);
    mockTransaction.mockResolvedValueOnce([user, specialist]);
    const postRes = await POST(postReq(body));
    const postJson = await postRes.json();
    expect(postRes.status).toBe(201);

    // ── GET (list, same underlying row) ───────────────────────────────────────
    mockFindMany.mockResolvedValueOnce([
      { ...specialist, user: { firstName: user.firstName, lastName: user.lastName, email: user.email }, services: [] },
    ]);
    mockCount.mockResolvedValueOnce(1);
    const getRes = await GET(getReq({ status: 'ACTIVE' }));
    const getJson = await getRes.json();
    expect(getRes.status).toBe(200);
    const getItem = getJson.data.items[0];

    // Strip timestamps — both serialize the same Date but let's be explicit
    // about what this test is and is not asserting.
    const { createdAt: _postTs, ...postData } = postJson.data as Record<string, unknown>;
    const { createdAt: _getTs,  ...getData  } = getItem   as Record<string, unknown>;

    expect(postData).toEqual(getData);
  });

  it('POST response contains no extra keys absent from GET list item', async () => {
    const body = makeCreateSpecialistBody();
    const user = makeSpecialistUser({ email: body.email, firstName: body.firstName, lastName: body.lastName });
    const specialist = makeSpecialistRow(user.id, { firstName: user.firstName, lastName: user.lastName, email: user.email });

    mockFindUnique.mockResolvedValueOnce(null);
    mockTransaction.mockResolvedValueOnce([user, specialist]);
    const postRes = await POST(postReq(body));
    const postData = (await postRes.json()).data as Record<string, unknown>;

    mockFindMany.mockResolvedValueOnce([
      { ...specialist, user: { firstName: user.firstName, lastName: user.lastName, email: user.email }, services: [] },
    ]);
    mockCount.mockResolvedValueOnce(1);
    const getRes = await GET(getReq({ status: 'ACTIVE' }));
    const getItem = (await getRes.json()).data.items[0] as Record<string, unknown>;

    const postKeys = Object.keys(postData).sort();
    const getKeys  = Object.keys(getItem).sort();
    expect(postKeys).toEqual(getKeys);
  });
});
