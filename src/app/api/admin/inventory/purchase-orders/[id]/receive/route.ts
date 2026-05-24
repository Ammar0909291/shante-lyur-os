export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';

/**
 * POST /api/admin/inventory/purchase-orders/[id]/receive
 *
 * Receives all or partial items from a purchase order.
 * For each line item, creates a PURCHASE StockMovement and updates currentStock.
 * If all items are fully received → status RECEIVED, else PARTIAL.
 *
 * Body: { items?: Array<{ id: string; receivedQty: number }> }
 *   If items is omitted, receives full ordered quantity for all items.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role') ?? '';
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);
  if (!['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(role)) return apiError('FORBIDDEN', 'Not authorized', 403);

  const { id } = await params;

  let body: { items?: Array<{ id: string; receivedQty: number }> } = {};
  try { body = await req.json() as typeof body; } catch { /* empty body = receive all */ }

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { inventoryItem: { select: { id: true, name: true, currentStock: true, unit: true } } } },
      },
    });

    if (!order) return apiError('NOT_FOUND', 'Order not found', 404);
    if (['RECEIVED', 'CANCELLED'].includes(order.status)) {
      return apiError('INVALID_STATE', `Cannot receive an order with status '${order.status}'`, 409);
    }

    // Build quantity map: orderItemId → qty to receive
    const receiveMap = new Map<string, number>();
    if (body.items?.length) {
      for (const item of body.items) {
        if (item.receivedQty > 0) receiveMap.set(item.id, item.receivedQty);
      }
    } else {
      // receive all remaining
      for (const item of order.items) {
        const remaining = Number(item.quantity) - Number(item.receivedQty);
        if (remaining > 0) receiveMap.set(item.id, remaining);
      }
    }

    if (receiveMap.size === 0) {
      return apiError('BAD_REQUEST', 'No items to receive', 400);
    }

    // Execute in transaction: update orderItem.receivedQty + stock movement + currentStock
    await prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        const qty = receiveMap.get(orderItem.id);
        if (!qty || qty <= 0) continue;

        const newReceivedQty = Number(orderItem.receivedQty) + qty;
        const newStock = Number(orderItem.inventoryItem.currentStock) + qty;

        await tx.purchaseOrderItem.update({
          where: { id: orderItem.id },
          data: { receivedQty: newReceivedQty },
        });

        await tx.inventoryItem.update({
          where: { id: orderItem.inventoryItemId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            inventoryItemId: orderItem.inventoryItemId,
            type: 'PURCHASE',
            quantity: qty,
            balanceAfter: newStock,
            reason: `Приёмка по заказу ${id.slice(0, 8)}`,
            userId,
          },
        });
      }

      // Update order status
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { orderId: id } });
      const allReceived = updatedItems.every((i) => Number(i.receivedQty) >= Number(i.quantity));
      const anyReceived = updatedItems.some((i) => Number(i.receivedQty) > 0);

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : order.status,
          receivedAt: allReceived ? new Date() : null,
        },
      });
    });

    // Return updated order
    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true } } } },
      },
    });

    return ok(updated);
  } catch (err) {
    console.error('[purchase-orders/receive] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to process receipt', 500);
  }
}
