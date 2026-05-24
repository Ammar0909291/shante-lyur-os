export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }

function r2(n: number) { return Math.round(n * 100) / 100; }
function pct(a: number, b: number) { return b > 0 ? r2((a - b) / b * 100) : 0; }

// ─── GET /api/executive/intelligence ─────────────────────────────────────────
// Query: ?period=7|30|90|180|365 (default 30)

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const days   = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get('period') ?? '30')));
  const now    = new Date();
  const from   = new Date(now.getTime() - days * 86_400_000);
  const prevFrom = new Date(from.getTime() - days * 86_400_000);

  console.log('[executive/intelligence]', { days, from, prevFrom });

  try {
    const [
      apts,
      prevApts,
      payments,
      refunds,
      expenses,
      specialists,
      inventoryAlerts,
      stockMovements,
    ] = await Promise.all([
      // Current period appointments
      prisma.appointment.findMany({
        where: { startAt: { gte: from, lte: now } },
        select: {
          id: true, status: true, totalPrice: true, paidAmount: true,
          startAt: true, checkedOutAt: true, specialistId: true, clientId: true,
          cancellationReason: true,
          specialist: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
          services: { select: { service: { select: { id: true, name: true, category: true } }, price: true } },
        },
      }),
      // Previous period appointments (for trend)
      prisma.appointment.findMany({
        where: { startAt: { gte: prevFrom, lt: from }, status: 'COMPLETED' },
        select: { id: true, totalPrice: true, clientId: true, specialistId: true },
      }),
      // Payments in period
      prisma.payment.findMany({
        where: { status: 'CAPTURED', paidAt: { gte: from, lte: now } },
        select: { amount: true, provider: true },
      }),
      // Refunds in period
      prisma.refund.findMany({
        where: { status: 'COMPLETED', processedAt: { gte: from, lte: now } },
        select: { amount: true },
      }),
      // Expenses in period
      prisma.expense.findMany({
        where: { date: { gte: from, lte: now } },
        select: { amount: true, category: true },
      }),
      // Specialists for efficiency calculation
      prisma.specialist.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          commissionRate: true,
          user: { select: { firstName: true, lastName: true } },
          appointments: {
            where: { startAt: { gte: from, lte: now } },
            select: { id: true, status: true, totalPrice: true, clientId: true, startAt: true },
          },
        },
      }),
      // Inventory low-stock alerts
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { id: true, name: true, currentStock: true, minStock: true, unit: true },
      }),
      // Recent stock movements for consumption rate
      prisma.stockMovement.findMany({
        where: { type: 'USAGE', createdAt: { gte: from, lte: now } },
        select: { inventoryItemId: true, quantity: true, item: { select: { name: true, costPerUnit: true } } },
      }),
    ]);

    // ── Revenue metrics ────────────────────────────────────────────────────────
    const completedApts  = apts.filter(a => a.status === 'COMPLETED');
    const cancelledApts  = apts.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW');

    // Primary revenue source: captured payments if the payment processor is active,
    // otherwise use appointment.totalPrice (cash/in-person salon model).
    const paymentRevenue     = payments.reduce((s, p) => s + Number(p.amount), 0);
    const appointmentRevenue = completedApts.reduce((s, a) => s + Number(a.totalPrice), 0);
    const totalRevenue       = paymentRevenue > 0 ? paymentRevenue : appointmentRevenue;

    const totalRefunds   = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses  = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netRevenue     = totalRevenue - totalRefunds;
    const netProfit      = netRevenue - totalExpenses;
    const prevRevenue    = prevApts.reduce((s, a) => s + Number(a.totalPrice), 0);
    const revenueTrend   = pct(totalRevenue, prevRevenue);
    const avgDailyRevenue = days > 0 ? r2(totalRevenue / days) : 0;

    // ── Occupancy ──────────────────────────────────────────────────────────────
    const totalApts      = apts.length;
    const occupancyRate  = totalApts > 0 ? r2(completedApts.length / totalApts * 100) : 0;
    const cancelRate     = totalApts > 0 ? r2(cancelledApts.length / totalApts * 100) : 0;

    // ── Client retention ──────────────────────────────────────────────────────
    const clientIdsInPeriod  = new Set(completedApts.map(a => a.clientId));
    const clientIdsPrevPeriod = new Set(prevApts.map(a => a.clientId));
    const returningClients   = [...clientIdsInPeriod].filter(id => clientIdsPrevPeriod.has(id)).length;
    const newClients         = [...clientIdsInPeriod].filter(id => !clientIdsPrevPeriod.has(id)).length;
    const retentionRate      = clientIdsInPeriod.size > 0
      ? r2(returningClients / clientIdsInPeriod.size * 100) : 0;

    // VIP clients: visited 3+ times in period
    const clientVisitCount = new Map<string, number>();
    for (const a of completedApts) clientVisitCount.set(a.clientId, (clientVisitCount.get(a.clientId) ?? 0) + 1);
    const vipCount = [...clientVisitCount.values()].filter(v => v >= 3).length;

    // At-risk clients: visited in prev period but not current
    const atRiskCount = [...clientIdsPrevPeriod].filter(id => !clientIdsInPeriod.has(id)).length;

    // ── Specialist intelligence ────────────────────────────────────────────────
    const specialistStats = specialists.map(spec => {
      const sApts        = spec.appointments;
      const sCompleted   = sApts.filter(a => a.status === 'COMPLETED');
      const sCancelled   = sApts.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW');
      const sRevenue     = sCompleted.reduce((s, a) => s + Number(a.totalPrice), 0);
      const sClients     = new Set(sCompleted.map(a => a.clientId));
      const sClientsPrev = new Set(prevApts.filter(a => a.specialistId === spec.id).map(a => a.clientId));
      const sReturning   = [...sClients].filter(id => sClientsPrev.has(id)).length;
      const completionRate = sApts.length > 0 ? r2(sCompleted.length / sApts.length * 100) : 0;
      const cancelRate   = sApts.length > 0 ? r2(sCancelled.length / sApts.length * 100) : 0;
      const avgCheck     = sCompleted.length > 0 ? r2(sRevenue / sCompleted.length) : 0;
      const retentionRate = sClients.size > 0 ? r2(sReturning / sClients.size * 100) : 0;
      // Efficiency = weighted score
      const efficiency   = r2(
        completionRate * 0.4 + retentionRate * 0.3 + Math.min(100, avgCheck / 50) * 0.3
      );
      // Utilization: apts per working day (assuming 5 days/week)
      const workingDays  = Math.max(1, days * 5 / 7);
      const utilization  = r2(sCompleted.length / workingDays);

      return {
        id:           spec.id,
        name:         `${spec.user.firstName} ${spec.user.lastName}`,
        totalApts:    sApts.length,
        completedApts: sCompleted.length,
        revenue:      r2(sRevenue),
        avgCheck,
        completionRate,
        cancelRate,
        retentionRate,
        efficiency,
        utilization,
        clientCount:  sClients.size,
        // Burnout risk: high if utilization > 8/day
        burnoutRisk:  utilization > 8 ? 'HIGH' : utilization > 6 ? 'MEDIUM' : 'LOW',
        // Low conversion: completion rate < 60%
        insight: completionRate < 60 && sApts.length > 3 ? 'LOW_CONVERSION'
          : utilization > 8 ? 'OVERLOADED'
          : retentionRate > 60 ? 'HIGH_RETENTION'
          : efficiency > 70 ? 'HIGH_PERFORMER'
          : 'NORMAL',
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // ── Service intelligence ───────────────────────────────────────────────────
    const serviceRevMap = new Map<string, { name: string; category: string; revenue: number; count: number }>();
    for (const apt of completedApts) {
      for (const { service, price } of apt.services) {
        const ex = serviceRevMap.get(service.id);
        if (ex) { ex.revenue += Number(price); ex.count++; }
        else serviceRevMap.set(service.id, { name: service.name, category: service.category, revenue: Number(price), count: 1 });
      }
    }
    const serviceList = [...serviceRevMap.entries()].map(([id, v]) => ({
      id, name: v.name, category: v.category,
      revenue: r2(v.revenue), count: v.count,
      avgPrice: v.count > 0 ? r2(v.revenue / v.count) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
    const topServices     = serviceList.slice(0, 5);
    const lowServices     = serviceList.slice().sort((a, b) => a.revenue - b.revenue).slice(0, 3);
    const fastGrowing     = serviceList.slice(0, 3); // simplified — use count as proxy

    // ── Daily revenue series (for chart) ──────────────────────────────────────
    const dayRevMap = new Map<string, number>();
    for (const apt of completedApts) {
      const day = apt.startAt.toISOString().split('T')[0];
      dayRevMap.set(day, (dayRevMap.get(day) ?? 0) + Number(apt.totalPrice));
    }
    const dailySeries: { date: string; revenue: number }[] = [];
    const cursor = new Date(from);
    while (cursor <= now) {
      const d = cursor.toISOString().split('T')[0];
      dailySeries.push({ date: d, revenue: r2(dayRevMap.get(d) ?? 0) });
      cursor.setTime(cursor.getTime() + 86_400_000);
    }

    // ── Inventory intelligence ────────────────────────────────────────────────
    const consumptionCost = (stockMovements as { quantity: unknown; item: { costPerUnit: unknown } }[]).reduce((s, mv) => {
      const cpu = mv.item.costPerUnit ? Number(mv.item.costPerUnit) : 0;
      return s + Math.abs(Number(mv.quantity)) * cpu;
    }, 0);
    const inventoryAlertCount = inventoryAlerts.length;

    // ── Business Health Score ─────────────────────────────────────────────────
    // Revenue score: based on trend, but also give baseline credit when revenue exists
    const hasRevenue         = totalRevenue > 0;
    const revenueScore       = hasRevenue
      ? Math.min(25, 12.5 + (revenueTrend > 5 ? 12.5 : revenueTrend > -5 ? 8 : revenueTrend > -15 ? 4 : 0))
      : 0;
    const retentionScore     = r2(Math.min(20, retentionRate * 0.2));
    const occupancyScore     = r2(Math.min(20, occupancyRate * 0.2));
    const cancellationScore  = r2(Math.min(15, Math.max(0, 15 - cancelRate * 0.5)));
    // Financial health: positive margin = full 20pts, near-zero = 12pts, negative = scaled down
    const marginRate         = totalRevenue > 0 ? netProfit / totalRevenue : 0;
    const financialScore     = marginRate > 0.15 ? 20 : marginRate > 0 ? 14 : marginRate > -0.1 ? 8 : 3;
    const healthScore        = r2(revenueScore + retentionScore + occupancyScore + cancellationScore + financialScore);
    const healthGrade        = healthScore >= 80 ? 'EXCELLENT' : healthScore >= 60 ? 'STABLE' : healthScore >= 40 ? 'RISK_DETECTED' : 'CRITICAL';

    // ── Operational risks ──────────────────────────────────────────────────────
    // (brief list — detailed version in /api/executive/risks)
    const risks: { severity: 'HIGH' | 'MEDIUM' | 'LOW'; code: string; message: string }[] = [];
    if (cancelRate > 20) risks.push({ severity: 'HIGH', code: 'CANCELLATION_SPIKE', message: `Высокий процент отмен: ${cancelRate}%` });
    if (revenueTrend < -15) risks.push({ severity: 'HIGH', code: 'REVENUE_DROP', message: `Выручка упала на ${Math.abs(revenueTrend)}% vs прошлый период` });
    if (atRiskCount > 5) risks.push({ severity: 'MEDIUM', code: 'RETENTION_RISK', message: `${atRiskCount} клиентов не вернулись с прошлого периода` });
    if (inventoryAlertCount > 0) risks.push({ severity: 'MEDIUM', code: 'LOW_INVENTORY', message: `${inventoryAlertCount} позиций ниже минимального запаса` });
    if (totalRefunds > totalRevenue * 0.1) risks.push({ severity: 'HIGH', code: 'EXCESSIVE_REFUNDS', message: `Возвраты составляют ${r2(totalRefunds / totalRevenue * 100)}% выручки` });
    specialistStats.forEach(s => {
      if (s.burnoutRisk === 'HIGH') risks.push({ severity: 'HIGH', code: 'SPECIALIST_OVERLOAD', message: `${s.name}: перегрузка (${s.utilization} записей/день)` });
      if (s.insight === 'LOW_CONVERSION') risks.push({ severity: 'MEDIUM', code: 'LOW_CONVERSION', message: `${s.name}: низкий показатель завершения (${s.completionRate}%)` });
    });
    if (occupancyRate < 40 && totalApts > 0) risks.push({ severity: 'MEDIUM', code: 'LOW_OCCUPANCY', message: `Низкая загруженность: ${occupancyRate}%` });

    risks.sort((a, b) => {
      const ord = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return ord[a.severity] - ord[b.severity];
    });

    // ── Daily briefing ────────────────────────────────────────────────────────
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayApts  = apts.filter(a => a.startAt >= todayStart);
    const todayCompleted = todayApts.filter(a => a.status === 'COMPLETED');
    const todayRevenue   = todayCompleted.reduce((s, a) => s + Number(a.totalPrice), 0);
    const expectedToday  = r2(avgDailyRevenue);

    const briefing = {
      todayRevenue:     r2(todayRevenue),
      expectedRevenue:  expectedToday,
      todayBookings:    todayApts.length,
      completedToday:   todayCompleted.length,
      occupancyRate,
      cancellationsToday: todayApts.filter(a => a.status === 'CANCELLED').length,
      lowStockAlerts:   inventoryAlertCount,
      topSpecialist:    specialistStats[0]?.name ?? null,
      riskCount:        risks.filter(r => r.severity === 'HIGH').length,
      retentionRate,
    };

    console.log('[executive/intelligence] done', {
      days, healthScore, healthGrade, totalRevenue, revenueTrend, riskCount: risks.length,
    });

    return ok({
      period: { days, from: from.toISOString(), to: now.toISOString() },
      health: {
        score: healthScore,
        grade: healthGrade,
        components: {
          revenue:      r2(revenueScore),
          retention:    r2(retentionScore),
          occupancy:    r2(occupancyScore),
          cancellation: r2(cancellationScore),
          financial:    r2(financialScore),
        },
      },
      revenue: {
        total:     r2(totalRevenue),
        net:       r2(netRevenue),
        profit:    r2(netProfit),
        expenses:  r2(totalExpenses),
        refunds:   r2(totalRefunds),
        avgDaily:  avgDailyRevenue,
        trend:     revenueTrend,
        prev:      r2(prevRevenue),
        projectedMonth: r2(avgDailyRevenue * 30),
        consumableCost: r2(consumptionCost),
      },
      bookings: {
        total:       totalApts,
        completed:   completedApts.length,
        cancelled:   cancelledApts.length,
        occupancyRate,
        cancelRate,
      },
      clients: {
        activeInPeriod: clientIdsInPeriod.size,
        returning:      returningClients,
        new:            newClients,
        atRisk:         atRiskCount,
        vip:            vipCount,
        retentionRate,
      },
      specialists: specialistStats,
      services: {
        top:        topServices,
        low:        lowServices,
        growing:    fastGrowing,
        all:        serviceList,
      },
      dailySeries,
      risks,
      briefing,
    });
  } catch (err) {
    console.error('[executive/intelligence] error', err);
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Failed to compute intelligence', 500);
  }
}
