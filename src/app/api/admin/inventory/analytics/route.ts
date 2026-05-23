export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function periodToDays(period: string, daysParam: string): number {
  switch (period) {
    case 'weekly':      return 7;
    case 'monthly':     return 30;
    case 'quarterly':   return 90;
    case 'yearly':      return 365;
    default: return Math.min(Number(daysParam || '30'), 365);
  }
}

// ─── GET /api/admin/inventory/analytics ──────────────────────────────────────
// Query params:
//   period = weekly | monthly | quarterly | yearly   (overrides days)
//   days   = 1-365 (default 30)

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  try {
    const period = req.nextUrl.searchParams.get('period') ?? '';
    const days = periodToDays(period, req.nextUrl.searchParams.get('days') ?? '30');
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    console.log('[inventory/analytics] starting', { days, period, since });

    const [usageMovements, allItems, completedApts, wasteMovements, roomsResult] = await Promise.all([
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
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true, unit: true, category: true,
          currentStock: true, costPerUnit: true, minStock: true,
          supplier: true,
          supplierRel: { select: { id: true, name: true } },
        },
      }),
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
      prisma.stockMovement.findMany({
        where: { type: 'WASTE', createdAt: { gte: since } },
        select: {
          inventoryItemId: true,
          quantity: true,
          createdAt: true,
          item: { select: { name: true, unit: true, costPerUnit: true } },
        },
      }),
      // Room utilization — wrapped so missing prisma.room (e.g. in tests) doesn't blow up analytics
      Promise.resolve().then(() => prisma.room.findMany({
        where: { isActive: true },
        include: {
          equipment: { select: { id: true, name: true, status: true, nextServiceAt: true } },
          appointments: {
            where: { startAt: { gte: since }, status: { notIn: ['CANCELLED', 'RESCHEDULED'] } },
            select: { id: true, startAt: true, endAt: true, totalDuration: true, status: true },
          },
        },
      })).catch(() => [] as never[]),
    ]);

    const rooms = roomsResult ?? [];

    // ── Top consumed items ─────────────────────────────────────────────────────
    const itemUsageMap = new Map<string, { name: string; unit: string; category: string; totalQty: number; totalCost: number; useCount: number }>();
    for (const mv of usageMovements) {
      const qty = Math.abs(Number(mv.quantity));
      const cost = mv.item.costPerUnit ? qty * Number(mv.item.costPerUnit) : 0;
      const existing = itemUsageMap.get(mv.inventoryItemId);
      if (existing) { existing.totalQty += qty; existing.totalCost += cost; existing.useCount++; }
      else {
        itemUsageMap.set(mv.inventoryItemId, {
          name: mv.item.name, unit: mv.item.unit, category: mv.item.category,
          totalQty: qty, totalCost: cost, useCount: 1,
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
        if (existing) { existing.revenue += Number(price); existing.consumableCost += consumCost; existing.count++; }
        else { serviceProfitMap.set(service.id, { name: service.name, revenue: Number(price), consumableCost: consumCost, count: 1 }); }
      }
    }
    const procedureCost = [...serviceProfitMap.entries()]
      .map(([id, v]) => ({
        id, name: v.name,
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
        }, 0), 0);
      const existing = specUsageMap.get(apt.specialistId);
      if (existing) { existing.totalCost += consumCost; existing.itemCount++; }
      else { specUsageMap.set(apt.specialistId, { name: specName, totalCost: consumCost, itemCount: 1 }); }
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
          id: item.id, name: item.name, unit: item.unit, currentStock,
          minStock: Number(item.minStock),
          avgDailyUsage: Math.round(avgDailyUsage * 1000) / 1000,
          daysRemaining, projectedStockoutDate,
          needsReorder: daysRemaining !== null && daysRemaining <= 14,
          monthlyUsageEstimate: Math.round(avgDailyUsage * 30 * 100) / 100,
          supplierName: item.supplierRel?.name ?? item.supplier ?? null,
          supplierId: item.supplierRel?.id ?? null,
        };
      })
      .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));

    // ── Waste stats ────────────────────────────────────────────────────────────
    const wasteByItem = new Map<string, { name: string; unit: string; qty: number; cost: number }>();
    for (const mv of wasteMovements) {
      const qty = Math.abs(Number(mv.quantity));
      const cost = mv.item.costPerUnit ? qty * Number(mv.item.costPerUnit) : 0;
      const existing = wasteByItem.get(mv.inventoryItemId);
      if (existing) { existing.qty += qty; existing.cost += cost; }
      else { wasteByItem.set(mv.inventoryItemId, { name: mv.item.name, unit: mv.item.unit, qty, cost }); }
    }
    const wasteStats = [...wasteByItem.entries()]
      .map(([id, v]) => ({ id, ...v, cost: Math.round(v.cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost);

    const totalWasteCost = wasteStats.reduce((s, w) => s + w.cost, 0);
    const totalConsumableCost = usageMovements.reduce((s, mv) => {
      const qty = Math.abs(Number(mv.quantity));
      return s + (mv.item.costPerUnit ? qty * Number(mv.item.costPerUnit) : 0);
    }, 0);

    // ── Room utilization ───────────────────────────────────────────────────────
    const totalWorkingMinutes = days * 10 * 60; // assume 10 working hours/day
    const roomUtilization = rooms.map((room) => {
      const bookedMinutes = room.appointments.reduce((s, a) => s + (a.totalDuration ?? 0), 0);
      const utilizationPct = totalWorkingMinutes > 0
        ? Math.min(100, Math.round(bookedMinutes / totalWorkingMinutes * 100))
        : 0;
      const appointmentCount = room.appointments.length;
      const completedCount = room.appointments.filter((a) => a.status === 'COMPLETED').length;

      const needsMaintenance = room.equipment.some((e) => e.status !== 'OPERATIONAL');
      const equipmentDue = room.equipment.filter((e) =>
        e.nextServiceAt && e.nextServiceAt <= new Date(Date.now() + 7 * 86_400_000)
      );

      return {
        id: room.id,
        name: room.name,
        type: room.type,
        utilizationPct,
        bookedMinutes,
        appointmentCount,
        completedCount,
        equipment: room.equipment.map((e) => ({
          id: e.id,
          name: e.name,
          status: e.status,
          nextServiceAt: e.nextServiceAt?.toISOString() ?? null,
        })),
        needsMaintenance,
        maintenanceDue: equipmentDue.map((e) => e.name),
      };
    }).sort((a, b) => b.utilizationPct - a.utilizationPct);

    console.log('[inventory/analytics] done', {
      topConsumed: topConsumed.length, procedures: procedureCost.length,
      specialists: specialistUsage.length, forecastItems: forecast.length,
      rooms: roomUtilization.length,
    });

    return ok({
      period: { days, period: period || 'custom', since: since.toISOString() },
      inventoryValue:      Math.round(inventoryValue * 100) / 100,
      totalConsumableCost: Math.round(totalConsumableCost * 100) / 100,
      topConsumed,
      procedureCost,
      specialistUsage,
      forecast,
      wasteStats,
      totalWasteCost:      Math.round(totalWasteCost * 100) / 100,
      roomUtilization,
    });
  } catch (err) {
    console.error('[inventory/analytics] error', err);
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
