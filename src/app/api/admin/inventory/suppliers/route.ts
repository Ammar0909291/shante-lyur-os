export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

function authHeaders(req: NextRequest) {
  return { userId: req.headers.get('x-user-id'), role: req.headers.get('x-user-role') ?? '' };
}

/** GET /api/admin/inventory/suppliers — list all suppliers */
export async function GET(req: NextRequest) {
  const { userId } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  try {
    const includeInactive = req.nextUrl.searchParams.get('all') === '1';

    const suppliers = await prisma.supplier.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        _count: { select: { items: true, purchaseOrders: true } },
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, status: true, totalCost: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return ok(suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      address: s.address,
      website: s.website,
      notes: s.notes,
      isActive: s.isActive,
      itemCount: s._count.items,
      orderCount: s._count.purchaseOrders,
      lastOrderAt: s.purchaseOrders[0]?.createdAt?.toISOString() ?? null,
      lastOrderStatus: s.purchaseOrders[0]?.status ?? null,
      lastOrderTotal: s.purchaseOrders[0]?.totalCost ? Number(s.purchaseOrders[0].totalCost) : null,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error('[suppliers] GET error', err);
    return apiError('INTERNAL_ERROR', 'Failed to load suppliers', 500);
  }
}

/** POST /api/admin/inventory/suppliers — create supplier */
export async function POST(req: NextRequest) {
  const { userId, role } = authHeaders(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return apiError('FORBIDDEN', 'Admin required', 403);

  let body: { name: string; contactName?: string; phone?: string; email?: string; address?: string; website?: string; notes?: string };
  try { body = await req.json() as typeof body; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  if (!body.name?.trim()) return apiError('BAD_REQUEST', 'name is required', 400);

  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: body.name.trim(),
        contactName: body.contactName?.trim() ?? null,
        phone: body.phone?.trim() ?? null,
        email: body.email?.trim() ?? null,
        address: body.address?.trim() ?? null,
        website: body.website?.trim() ?? null,
        notes: body.notes?.trim() ?? null,
      },
    });
    return ok(supplier);
  } catch (err) {
    console.error('[suppliers] POST error', err);
    return apiError('INTERNAL_ERROR', 'Failed to create supplier', 500);
  }
}
