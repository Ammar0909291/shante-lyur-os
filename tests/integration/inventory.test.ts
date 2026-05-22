/**
 * Inventory system integration tests.
 * Covers: items CRUD, stock movements, alerts, service mappings,
 * analytics, auto-deduction on appointment completion, and data-integrity guards.
 */
import { NextRequest } from 'next/server';
import { GET as itemsGET,  POST as itemsPOST }  from '@/app/api/admin/inventory/route';
import { GET as itemGET,   PATCH as itemPATCH,  DELETE as itemDELETE } from '@/app/api/admin/inventory/[id]/route';
import { GET as movesGET,  POST as movesPOST }  from '@/app/api/admin/inventory/[id]/movements/route';
import { GET as alertsGET }                     from '@/app/api/admin/inventory/alerts/route';
import { GET as mappingsGET, POST as mappingsPOST } from '@/app/api/admin/inventory/mappings/route';
import { PATCH as mappingPATCH, DELETE as mappingDELETE } from '@/app/api/admin/inventory/mappings/[id]/route';
import { GET as analyticsGET }                  from '@/app/api/admin/inventory/analytics/route';
import { POST as transitionPOST }               from '@/app/api/operations/appointments/[id]/transition/route';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    inventoryItem:       { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    stockMovement:       { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
    inventoryServiceLink:{ findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    service:             { findUnique: jest.fn() },
    appointment:         { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction:        jest.fn(),
  },
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function adminReq(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function patchReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'PATCH',
    headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function deleteReq(url: string): NextRequest {
  return new NextRequest(url, { method: 'DELETE', headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN' } });
}
function makeCtx(id: string) { return { params: Promise.resolve({ id }) }; }

// Helper to make a Decimal-like object (valueOf lets Number(dec(n)) work)
function dec(n: number) { return { toNumber: () => n, valueOf: () => n, toString: () => String(n) }; }

// UUID constants for routes that validate UUID format
const UUID_ITEM = '550e8400-e29b-41d4-a716-446655440001';
const UUID_SVC  = '550e8400-e29b-41d4-a716-446655440002';
const UUID_LINK = '550e8400-e29b-41d4-a716-446655440003';

const ITEM = {
  id: 'item-1', name: 'Массажное масло', sku: 'OIL-001', category: 'MASSAGE_OILS',
  unit: 'мл', currentStock: dec(500), minStock: dec(100), costPerUnit: dec(2),
  supplier: 'ООО Массаж', expiresAt: null, isActive: true, notes: null,
  createdAt: new Date(), updatedAt: new Date(),
};

const ITEM_LOW = { ...ITEM, id: 'item-2', name: 'Ботокс', category: 'COSMETOLOGY_INJECTABLES', unit: 'ед', currentStock: dec(5), minStock: dec(10), costPerUnit: dec(500) };
const ITEM_EXPIRING = { ...ITEM, id: 'item-3', name: 'Сыворотка', currentStock: dec(50), minStock: dec(10), costPerUnit: dec(100), expiresAt: new Date(Date.now() + 10 * 86400000) };

function prisma() {
  const { prisma: p } = jest.requireMock('@/infrastructure/config/prisma-client') as {
    prisma: {
      inventoryItem:        { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
      stockMovement:        { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; count: jest.Mock };
      inventoryServiceLink: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
      service:              { findUnique: jest.Mock };
      appointment:          { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
      $transaction:         jest.Mock;
    };
  };
  return p;
}

beforeEach(() => { jest.clearAllMocks(); });

// ─── Suite: GET /api/admin/inventory ─────────────────────────────────────────

describe('GET /api/admin/inventory', () => {
  it('returns item list with summary', async () => {
    const db = prisma();
    db.inventoryItem.findMany.mockResolvedValue([ITEM]);
    db.inventoryItem.count.mockResolvedValue(1);
    const res = await itemsGET(adminReq('http://t/api/admin/inventory'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { items: unknown[]; total: number; summary: unknown } };
    expect(Array.isArray(json.data.items)).toBe(true);
    expect(json.data.total).toBe(1);
    expect(json.data.summary).toBeDefined();
  });

  it('filters by category', async () => {
    const db = prisma();
    db.inventoryItem.findMany.mockResolvedValue([]);
    db.inventoryItem.count.mockResolvedValue(0);
    const res = await itemsGET(adminReq('http://t/api/admin/inventory?category=MASSAGE_OILS'));
    expect(res.status).toBe(200);
    const call = db.inventoryItem.findMany.mock.calls[0][0] as { where: { category?: string } };
    expect(call.where.category).toBe('MASSAGE_OILS');
  });
});

// ─── Suite: POST /api/admin/inventory ────────────────────────────────────────

describe('POST /api/admin/inventory', () => {
  it('creates item and initial stock movement', async () => {
    const db = prisma();
    const created = { ...ITEM, id: 'new-item' };
    db.inventoryItem.create.mockResolvedValue(created);
    db.stockMovement.create.mockResolvedValue({ id: 'mv-1' });

    const res = await itemsPOST(adminReq('http://t/api/admin/inventory', {
      name: 'Массажное масло', category: 'MASSAGE_OILS', unit: 'мл',
      currentStock: 500, minStock: 100, costPerUnit: 2, supplier: 'ООО Массаж',
    }));
    expect(res.status).toBe(201);
    expect(db.inventoryItem.create).toHaveBeenCalledTimes(1);
    expect(db.stockMovement.create).toHaveBeenCalledTimes(1); // initial PURCHASE movement
  });

  it('returns 400 for missing required fields', async () => {
    const res = await itemsPOST(adminReq('http://t/api/admin/inventory', { category: 'GENERAL' }));
    expect(res.status).toBe(400);
  });

  it('creates item with currentStock=0 — no initial movement', async () => {
    const db = prisma();
    db.inventoryItem.create.mockResolvedValue({ ...ITEM, currentStock: dec(0) });
    db.stockMovement.create.mockResolvedValue({ id: 'mv-1' });

    const res = await itemsPOST(adminReq('http://t/api/admin/inventory', {
      name: 'Пустой склад', category: 'GENERAL', unit: 'шт',
      currentStock: 0, minStock: 5,
    }));
    expect(res.status).toBe(201);
    expect(db.stockMovement.create).not.toHaveBeenCalled();
  });
});

// ─── Suite: GET/PATCH/DELETE /api/admin/inventory/[id] ───────────────────────

describe('PATCH /api/admin/inventory/[id]', () => {
  it('updates item fields', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue(ITEM);
    db.inventoryItem.update.mockResolvedValue({ ...ITEM, name: 'Новое масло' });
    const res = await itemPATCH(patchReq('http://t/api/admin/inventory/item-1', { name: 'Новое масло' }), makeCtx('item-1'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { name: string } };
    expect(json.data.name).toBe('Новое масло');
  });

  it('returns 404 for unknown item', async () => {
    prisma().inventoryItem.findUnique.mockResolvedValue(null);
    const res = await itemPATCH(patchReq('http://t/api/admin/inventory/bad', { name: 'x' }), makeCtx('bad'));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/inventory/[id]', () => {
  it('soft-deletes (sets isActive=false)', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue(ITEM);
    db.inventoryItem.update.mockResolvedValue({ ...ITEM, isActive: false });
    const res = await itemDELETE(deleteReq('http://t/api/admin/inventory/item-1'), makeCtx('item-1'));
    expect(res.status).toBe(200);
    const call = db.inventoryItem.update.mock.calls[0][0] as { data: { isActive: boolean } };
    expect(call.data.isActive).toBe(false);
  });
});

describe('GET /api/admin/inventory/[id]', () => {
  it('returns item with service links and movements', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue({ ...ITEM, serviceLinks: [], movements: [] });
    const res = await itemGET(adminReq('http://t/api/admin/inventory/item-1'), makeCtx('item-1'));
    expect(res.status).toBe(200);
  });
});

// ─── Suite: Movements ─────────────────────────────────────────────────────────

describe('POST /api/admin/inventory/[id]/movements (stock adjustment)', () => {
  it('PURCHASE adds stock', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue(ITEM);
    db.inventoryItem.update.mockResolvedValue({ ...ITEM, currentStock: dec(600) });
    db.stockMovement.create.mockResolvedValue({ id: 'mv-1', quantity: dec(100), balanceAfter: dec(600) });
    db.$transaction.mockImplementation(async (ops: unknown[]) => { return (ops as Array<() => Promise<unknown>>).map((op) => typeof op === 'function' ? op() : op); });

    const res = await movesPOST(adminReq('http://t/api/admin/inventory/item-1/movements', { type: 'PURCHASE', quantity: 100, reason: 'Поставка' }), makeCtx('item-1'));
    expect(res.status).toBe(201);
  });

  it('USAGE deducts stock', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue(ITEM);
    db.inventoryItem.update.mockResolvedValue({ ...ITEM, currentStock: dec(400) });
    db.stockMovement.create.mockResolvedValue({ id: 'mv-2', quantity: dec(-100), balanceAfter: dec(400) });
    db.$transaction.mockImplementation(async (ops: unknown[]) => (ops as Array<() => Promise<unknown>>).map((op) => typeof op === 'function' ? op() : op));

    const res = await movesPOST(adminReq('http://t/api/admin/inventory/item-1/movements', { type: 'USAGE', quantity: 100 }), makeCtx('item-1'));
    expect(res.status).toBe(201);
  });

  it('returns 422 when deduction would create negative stock', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue({ ...ITEM, currentStock: dec(50) });
    db.$transaction.mockImplementation(async (ops: unknown[]) => (ops as Array<() => Promise<unknown>>).map((op) => typeof op === 'function' ? op() : op));

    const res = await movesPOST(adminReq('http://t/api/admin/inventory/item-1/movements', { type: 'USAGE', quantity: 100 }), makeCtx('item-1'));
    expect(res.status).toBe(422); // INSUFFICIENT_STOCK
  });

  it('lists movements with pagination', async () => {
    const db = prisma();
    db.stockMovement.findMany.mockResolvedValue([]);
    db.stockMovement.count.mockResolvedValue(0);
    const res = await movesGET(adminReq('http://t/api/admin/inventory/item-1/movements?page=1&limit=20'), makeCtx('item-1'));
    expect(res.status).toBe(200);
  });
});

// ─── Suite: Alerts ────────────────────────────────────────────────────────────

describe('GET /api/admin/inventory/alerts', () => {
  it('detects low stock', async () => {
    prisma().inventoryItem.findMany.mockResolvedValue([ITEM, ITEM_LOW]);
    const res = await alertsGET();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { lowStock: Array<{ id: string }> } };
    expect(json.data.lowStock.some((a) => a.id === 'item-2')).toBe(true);
  });

  it('detects expiring products', async () => {
    prisma().inventoryItem.findMany.mockResolvedValue([ITEM_EXPIRING]);
    const res = await alertsGET();
    const json = await res.json() as { data: { expiring: Array<{ id: string; daysLeft: number }> } };
    expect(json.data.expiring.length).toBeGreaterThan(0);
    expect(json.data.expiring[0].daysLeft).toBeLessThanOrEqual(30);
  });

  it('counts are correct', async () => {
    prisma().inventoryItem.findMany.mockResolvedValue([ITEM_LOW, ITEM_EXPIRING]);
    const res = await alertsGET();
    const json = await res.json() as { data: { counts: { lowStock: number; expiring: number } } };
    expect(json.data.counts.lowStock).toBeGreaterThanOrEqual(1);
    expect(json.data.counts.expiring).toBeGreaterThanOrEqual(1);
  });
});

// ─── Suite: Service Mappings ──────────────────────────────────────────────────

describe('GET /api/admin/inventory/mappings', () => {
  it('returns all mappings', async () => {
    prisma().inventoryServiceLink.findMany.mockResolvedValue([{
      id: UUID_LINK, inventoryItemId: UUID_ITEM, serviceId: UUID_SVC, quantityPerUse: dec(5),
      createdAt: new Date(),
      inventoryItem: { id: UUID_ITEM, name: 'Масло', unit: 'мл', category: 'MASSAGE_OILS', currentStock: dec(500) },
      service: { id: UUID_SVC, name: 'Классический массаж', category: 'MASSAGE' },
    }]);
    const res = await mappingsGET(adminReq('http://t/api/admin/inventory/mappings'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ id: string; quantityPerUse: number }> };
    expect(json.data.length).toBe(1);
    expect(json.data[0].quantityPerUse).toBe(5);
  });
});

describe('POST /api/admin/inventory/mappings', () => {
  it('creates mapping between item and service', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue(ITEM);
    db.service.findUnique.mockResolvedValue({ id: UUID_SVC, name: 'Массаж' });
    db.inventoryServiceLink.create.mockResolvedValue({
      id: UUID_LINK, inventoryItemId: UUID_ITEM, serviceId: UUID_SVC, quantityPerUse: dec(10), createdAt: new Date(),
      inventoryItem: { id: UUID_ITEM, name: 'Масло', unit: 'мл' },
      service: { id: UUID_SVC, name: 'Массаж' },
    });

    const res = await mappingsPOST(adminReq('http://t/api/admin/inventory/mappings', { inventoryItemId: UUID_ITEM, serviceId: UUID_SVC, quantityPerUse: 10 }));
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { id: string; quantityPerUse: number } };
    expect(json.data.id).toBe(UUID_LINK);
    expect(json.data.quantityPerUse).toBe(10);
  });

  it('returns 404 if item does not exist', async () => {
    const db = prisma();
    db.inventoryItem.findUnique.mockResolvedValue(null);
    db.service.findUnique.mockResolvedValue({ id: UUID_SVC, name: 'Массаж' });
    const res = await mappingsPOST(adminReq('http://t/api/admin/inventory/mappings', { inventoryItemId: UUID_ITEM, serviceId: UUID_SVC, quantityPerUse: 5 }));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid body', async () => {
    const res = await mappingsPOST(adminReq('http://t/api/admin/inventory/mappings', { inventoryItemId: 'not-uuid' }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/admin/inventory/mappings/[id]', () => {
  it('updates quantityPerUse', async () => {
    const db = prisma();
    db.inventoryServiceLink.findUnique.mockResolvedValue({ id: UUID_LINK, inventoryItemId: UUID_ITEM, serviceId: UUID_SVC, quantityPerUse: dec(5) });
    db.inventoryServiceLink.update.mockResolvedValue({ id: UUID_LINK, quantityPerUse: dec(15) });
    const res = await mappingPATCH(patchReq('http://t/api/admin/inventory/mappings/link-1', { quantityPerUse: 15 }), makeCtx('link-1'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { quantityPerUse: number } };
    expect(json.data.quantityPerUse).toBe(15);
  });
});

describe('DELETE /api/admin/inventory/mappings/[id]', () => {
  it('deletes mapping', async () => {
    const db = prisma();
    db.inventoryServiceLink.findUnique.mockResolvedValue({ id: 'link-1' });
    db.inventoryServiceLink.delete.mockResolvedValue({ id: 'link-1' });
    const res = await mappingDELETE(deleteReq('http://t/api/admin/inventory/mappings/link-1'), makeCtx('link-1'));
    expect(res.status).toBe(200);
    expect(db.inventoryServiceLink.delete).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for unknown mapping', async () => {
    prisma().inventoryServiceLink.findUnique.mockResolvedValue(null);
    const res = await mappingDELETE(deleteReq('http://t/api/admin/inventory/mappings/bad'), makeCtx('bad'));
    expect(res.status).toBe(404);
  });
});

// ─── Suite: Analytics ─────────────────────────────────────────────────────────

describe('GET /api/admin/inventory/analytics', () => {
  it('returns analytics shape with all required sections', async () => {
    const db = prisma();
    db.stockMovement.findMany.mockResolvedValue([]);
    db.inventoryItem.findMany.mockResolvedValue([ITEM]);
    db.appointment.findMany.mockResolvedValue([]);

    const res = await analyticsGET(adminReq('http://t/api/admin/inventory/analytics'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Record<string, unknown> };
    expect(typeof json.data.inventoryValue).toBe('number');
    expect(typeof json.data.totalConsumableCost).toBe('number');
    expect(Array.isArray(json.data.topConsumed)).toBe(true);
    expect(Array.isArray(json.data.procedureCost)).toBe(true);
    expect(Array.isArray(json.data.specialistUsage)).toBe(true);
    expect(Array.isArray(json.data.forecast)).toBe(true);
    expect(Array.isArray(json.data.wasteStats)).toBe(true);
  });

  it('calculates inventory value from stock × costPerUnit', async () => {
    const db = prisma();
    db.stockMovement.findMany.mockResolvedValue([]);
    db.inventoryItem.findMany.mockResolvedValue([ITEM]); // 500 мл × 2 ₽ = 1000 ₽
    db.appointment.findMany.mockResolvedValue([]);

    const res = await analyticsGET(adminReq('http://t/api/admin/inventory/analytics'));
    const json = await res.json() as { data: { inventoryValue: number } };
    expect(json.data.inventoryValue).toBe(1000);
  });
});

// ─── Suite: Auto-deduction on appointment completion ─────────────────────────

describe('POST /api/operations/appointments/[id]/transition — inventory deduction', () => {
  function makeAptWithServices() {
    return {
      id: 'apt-1',
      status: 'IN_PROGRESS',
      checkedInAt: new Date(),
      specialistId: 'spec-1',
      services: [{
        service: {
          id: 'svc-1',
          name: 'Классический массаж',
          inventoryLinks: [{
            id: 'link-1',
            inventoryItemId: 'item-1',
            quantityPerUse: dec(10),
            inventoryItem: { id: 'item-1', name: 'Масло', currentStock: dec(500), unit: 'мл', costPerUnit: dec(2) },
          }],
        },
      }],
    };
  }

  it('deducts inventory on complete action', async () => {
    const db = prisma();
    db.appointment.findUnique
      .mockResolvedValueOnce({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date() }) // transition check
      .mockResolvedValueOnce(makeAptWithServices()); // inventory lookup

    db.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'COMPLETED', checkedInAt: new Date(), checkedOutAt: new Date() });

    // $transaction callback
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        inventoryItem: {
          findUnique: jest.fn().mockResolvedValue({ currentStock: dec(500) }),
          update: jest.fn().mockResolvedValue({ currentStock: dec(490) }),
        },
        stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv-1' }) },
      };
      return fn(tx);
    });

    const res = await transitionPOST(
      new NextRequest('http://t/api/operations/appointments/apt-1/transition', {
        method: 'POST',
        headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      }),
      { params: Promise.resolve({ id: 'apt-1' }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe('COMPLETED');
    expect(db.appointment.update).toHaveBeenCalledTimes(1);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('cancel does NOT trigger inventory deduction', async () => {
    const db = prisma();
    db.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date() });
    db.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'CANCELLED', checkedInAt: new Date(), checkedOutAt: null });

    const res = await transitionPOST(
      new NextRequest('http://t/api/operations/appointments/apt-1/transition', {
        method: 'POST',
        headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      }),
      { params: Promise.resolve({ id: 'apt-1' }) },
    );

    expect(res.status).toBe(200);
    expect(db.$transaction).not.toHaveBeenCalled(); // no inventory deduction
  });

  it('noshow does NOT trigger inventory deduction', async () => {
    const db = prisma();
    db.appointment.findUnique.mockResolvedValue({ id: 'apt-1', status: 'CONFIRMED', checkedInAt: null });
    db.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'NO_SHOW', checkedInAt: null, checkedOutAt: null });

    const res = await transitionPOST(
      new NextRequest('http://t/api/operations/appointments/apt-1/transition', {
        method: 'POST',
        headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'noshow' }),
      }),
      { params: Promise.resolve({ id: 'apt-1' }) },
    );

    expect(res.status).toBe(200);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('complete with no inventory links returns 200 (no-op deduction)', async () => {
    const db = prisma();
    db.appointment.findUnique
      .mockResolvedValueOnce({ id: 'apt-1', status: 'IN_PROGRESS', checkedInAt: new Date() })
      .mockResolvedValueOnce({ id: 'apt-1', specialistId: 'spec-1', services: [{ service: { id: 'svc-1', name: 'Массаж', inventoryLinks: [] } }] });

    db.appointment.update.mockResolvedValue({ id: 'apt-1', status: 'COMPLETED', checkedInAt: new Date(), checkedOutAt: new Date() });

    const res = await transitionPOST(
      new NextRequest('http://t/api/operations/appointments/apt-1/transition', {
        method: 'POST',
        headers: { 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      }),
      { params: Promise.resolve({ id: 'apt-1' }) },
    );
    expect(res.status).toBe(200);
    expect(db.$transaction).not.toHaveBeenCalled(); // no deductions needed
  });
});
