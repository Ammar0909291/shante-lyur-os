export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// ─── GET /api/admin/inventory/analytics ───────────────────────────────────────
// Returns:
//   topConsumed        — items by total USAGE quantity (last 30 days)
//   procedureCost      — per-service consumable cost + revenue
//   specialistUsage    — per-specialist material spend
//   inventoryValue     — total current stock value
//   forecast           — per-item days-remaining projection
//   wasteStats         — WASTE movements last 30 days

export async function GET(req: NextRequest) {
  try {
    const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? '30'), 365);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    console.log('[inventory/analytics] starting', { days, since });

    const [
      usageMovements,
      allItems,
      completedApts,
      wasteMovements,
    ] = await Promise.all([
      // All USAGE movements in period
      prisma.stockMovement.findMany({
        where: { type: 'USAGE', createdAt: { gte: since } },
        select: {
          inventoryItemId: true,
          quantity: true,
          appointmentId: true,
          userId: true,
          createdAt: true,
          item: { select: { name: true, unit: true, costPerUnit: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // All active inventory items for value/forecast
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { id: true, name: true, unit: true, category: true, currentStock: true, costPerUnit: true, minStock: true },
      }),
      // Completed appointments in period for profitability
      prisma.appointment.findMany({
        where: { status: 'COMPLETED', checkedOutAt: { gte: since } },
        select: {
          id: true,
          totalPrice: true,
          specialistId: true,
          specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
          services: {
            select: {
              service: {
                select: {
                  id: true,
                  name: true,
                  inventoryLinks: {
                    select: { quantityPerUse: true, inventoryItem: { select: { costPerUnit: true } } },
                  },
                },
              },
              price: true,
            },
          },
        },
      }),
      // WASTE movements in period
      prisma.stockMovement.findMany({
        where: { type: 'WASTE', createdAt: { gte: since } },
        select: {
          inventoryItemId: true,
          quantity: true,
          createdAt: true,
          item: { select: { name: true, unit: true, costPerUnit: true } },
        },
      }),
    ]);

    // ── Top consumed items ─────────────────────────────────────────────────────
    const itemUsageMap = new Map<string, { name: string; unit: string; category: string; totalQty: number; totalCost: number; useCount: number }>();
    for (const mv of usageMovements) {
      const qty = Math.abs(Number(mv.quantity));
      const cost = mv.item.costPerUnit ? qty * Number(mv.item.costPerUnit) : 0;
      const existing = itemUsageMap.get(mv.inventoryItemId);
      if (existing) {
        existing.totalQty += qty;
        existing.totalCost += cost;
        existing.useCount++;
      } else {
        itemUsageMap.set(mv.inventoryItemId, {
          name: mv.item.name,
          unit: mv.item.unit,
          category: mv.item.category,
          totalQty: qty,
          totalCost: cost,
          useCount: 1,
        });
      }
    }
    const topConsumed = [...itemUsageMap.entries()]
      .map(([id, v]) => ({ id, ...v, totalCost: Math.round(v.totalCost * 100) / 100 }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 20);

    // ── Procedure profitability ────────────────────────────────────────────────
    const serviceProfitMap = new Map<string, { name: string; revenue: number; consumableCost: number; count: number }>();
    for (const apt of completedApts) {
      for (const { service, price } of apt.services) {
        const consumCost = service.inventoryLinks.reduce((sum, link) => {
          const cpu = link.inventoryItem.costPerUnit ? Number(link.inventoryItem.costPerUnit) : 0;
          return sum + Number(link.quantityPerUse) * cpu;
        }, 0);
        const existing = serviceProfitMap.get(service.id);
        if (existing) {
          existing.revenue += Number(price);
          existing.consumableCost += consumCost;
          existing.count++;
        } else {
          serviceProfitMap.set(service.id, {
            name: service.name,
            revenue: Number(price),
            consumableCost: consumCost,
            count: 1,
          });
        }
      }
    }
    const procedureCost = [...serviceProfitMap.entries()]
      .map(([id, v]) => ({
        id,
        name: v.name,
        revenue: Math.round(v.revenue * 100) / 100,
        consumableCost: Math.round(v.consumableCost * 100) / 100,
        margin: v.revenue > 0 ? Math.round((1 - v.consumableCost / v.revenue) * 10000) / 100 : null,
        count: v.count,
        avgConsumableCost: v.count > 0 ? Math.round(v.consumableCost / v.count * 100) / 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Specialist material usage ──────────────────────────────────────────────
    const specUsageMap = new Map<string, { name: string; totalCost: number; itemCount: number }>();
    for (const apt of completedApts) {
      if (!apt.specialistId) continue;
      const specName = apt.specialist ? `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}` : 'Неизвестно';
      const consumCost = apt.services.reduce((sum, { service }) =>
        sum + service.inventoryLinks.reduce((s2, link) => {
          const cpu = link.inventoryItem.costPerUnit ? Number(link.inventoryItem.costPerUnit) : 0;
          return s2 + Number(link.quantityPerUse) * cpu;
        }, 0),
      0);
      const existing = specUsageMap.get(apt.specialistId);
      if (existing) {
        existing.totalCost += consumCost;
        existing.itemCount++;
      } else {
        specUsageMap.set(apt.specialistId, { name: specName, totalCost: consumCost, itemCount: 1 });
      }
    }
    const specialistUsage = [...specUsageMap.entries()]
      .map(([id, v]) => ({ id, name: v.name, totalCost: Math.round(v.totalCost * 100) / 100, procedureCount: v.itemCount }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // ── Inventory value ────────────────────────────────────────────────────────
    const inventoryValue = allItems.reduce((sum, item) => {
      if (!item.costPerUnit) return sum;
      return sum + Number(item.currentStock) * Number(item.costPerUnit);
    }, 0);

    // ── Forecasting ────────────────────────────────────────────────────────────
    // For each item: calculate avg daily usage over period → estimate days remaining
    const itemDailyUsage = new Map<string, number>();
    for (const [itemId, v] of itemUsageMap.entries()) {
      itemDailyUsage.set(itemId, v.totalQty / days);
    }

    const forecast = allItems
      .filter((item) => itemDailyUsage.has(item.id))
      .map((item) => {
        const avgDailyUsage = itemDailyUsage.get(item.id)!;
        const currentStock = Number(item.currentStock);
        const daysRemaining = avgDailyUsage > 0 ? Math.floor(currentStock / avgDailyUsage) : null;
        const projectedStockoutDate = daysRemaining !== null
          ? new Date(Date.now() + daysRemaining * 24 * 3600 * 1000).toISOString().split('T')[0]
          : null;
        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          currentStock,
          minStock: Number(item.minStock),
          avgDailyUsage: Math.round(avgDailyUsage * 1000) / 1000,
          daysRemaining,
          projectedStockoutDate,
          needsReorder: daysRemaining !== null && daysRemaining <= 14,
          monthlyUsageEstimate: Math.round(avgDailyUsage * 30 * 100) / 100,
        };
      })
      .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));

    // ── Waste stats ────────────────────────────────────────────────────────────
    const wasteByItem = new Map<string, { name: string; unit: string; qty: number; cost: number }>();
    for (const mv of wasteMovements) {
      const qty = Math.abs(Number(mv.quantity));
      const cost = mv.item.costPerUnit ? qty * Number(mv.item.costPerUnit) : 0;
      const existing = wasteByItem.get(mv.inventoryItemId);
      if (existing) {
        existing.qty += qty;
        existing.cost += cost;
      } else {
        wasteByItem.set(mv.inventoryItemId, { name: mv.item.name, unit: mv.item.unit, qty, cost });
      }
    }
    const wasteStats = [...wasteByItem.entries()]
      .map(([id, v]) => ({ id, ...v, cost: Math.round(v.cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost);

    const totalWasteCost = wasteStats.reduce((s, w) => s + w.cost, 0);
    const totalConsumableCost = usageMovements.reduce((s, mv) => {
      const qty = Math.abs(Number(mv.quantity));
      return s + (mv.item.costPerUnit ? qty * Number(mv.item.costPerUnit) : 0);
    }, 0);

    console.log('[inventory/analytics] done', {
      topConsumed: topConsumed.length,
      procedures: procedureCost.length,
      specialists: specialistUsage.length,
      forecastItems: forecast.length,
    });

    return ok({
      period: { days, since: since.toISOString() },
      inventoryValue:       Math.round(inventoryValue * 100) / 100,
      totalConsumableCost:  Math.round(totalConsumableCost * 100) / 100,
      topConsumed,
      procedureCost,
      specialistUsage,
      forecast,
      wasteStats,
      totalWasteCost: Math.round(totalWasteCost * 100) / 100,
    });
  } catch (err) {
    console.error('[inventory/analytics] error', err);
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
