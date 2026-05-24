export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function r2(n: number) { return Math.round(n * 100) / 100; }

// ─── GET /api/payroll/analytics ───────────────────────────────────────────────
// Executive payroll analytics: labor cost, ROI per specialist, burnout risk.
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults to last 30 days)

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Executive payroll analytics require admin access', 403);
  }

  const p    = req.nextUrl.searchParams;
  const from = p.get('from') ? new Date(p.get('from')! + 'T00:00:00.000Z') : new Date(Date.now() - 30 * 86_400_000);
  const to   = p.get('to')   ? new Date(p.get('to')!   + 'T23:59:59.999Z') : new Date();
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) || 1;

  try {
    const [records, specialists, attendance] = await Promise.all([
      // All paid/approved payroll records in period
      prisma.payrollRecord.findMany({
        where: { periodStart: { gte: from, lte: to } },
        select: {
          id: true, specialistId: true, status: true,
          baseSalary: true, totalCommission: true, totalBonuses: true,
          totalPenalties: true, netPayable: true,
          completedApts: true, totalRevenue: true, totalRefunded: true,
          workingDays: true, workedHours: true,
          specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      // Active specialists with appointment data
      prisma.specialist.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true, commissionRate: true, department: true,
          user: { select: { firstName: true, lastName: true } },
          compensationConfig: { select: { type: true, baseSalary: true } },
          appointments: {
            where: { startAt: { gte: from, lte: to }, status: 'COMPLETED' },
            select: { id: true, totalPrice: true, paidAmount: true, totalDuration: true, clientId: true },
          },
        },
      }),
      // Attendance summary
      prisma.attendanceRecord.findMany({
        where: { date: { gte: from, lte: to } },
        select: { specialistId: true, status: true, checkInAt: true, checkOutAt: true, breakMinutes: true },
      }),
    ]);

    // ── Per-specialist aggregation ─────────────────────────────────────────────
    const specStats = specialists.map((spec) => {
      const rec = records.find((r) => r.specialistId === spec.id);
      const specAtt = attendance.filter((a) => a.specialistId === spec.id);

      const revenue   = spec.appointments.reduce((s, a) => s + Number(a.totalPrice), 0);
      const paidRev   = spec.appointments.reduce((s, a) => s + Number(a.paidAmount), 0);
      const laborCost = rec ? Number(rec.netPayable) : 0;
      const roi       = laborCost > 0 ? r2(paidRev / laborCost) : null; // revenue per ₽ of labor
      const margin    = paidRev > 0 ? r2((paidRev - laborCost) / paidRev * 100) : 0; // %
      const totalDurMin = spec.appointments.reduce((s, a) => s + (a.totalDuration ?? 0), 0);
      const workedDays  = specAtt.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
      const absentDays  = specAtt.filter(a => a.status === 'ABSENT').length;
      const workedHrs   = specAtt.reduce((s, a) => {
        if (!a.checkInAt || !a.checkOutAt) return s;
        return s + Math.max(0, (a.checkOutAt.getTime() - a.checkInAt.getTime()) / 3_600_000 - a.breakMinutes / 60);
      }, 0);
      const dailyLoad   = workedDays > 0 ? totalDurMin / 60 / workedDays : 0;
      const burnout     = dailyLoad > 8 ? 'HIGH' : dailyLoad > 6 ? 'MEDIUM' : 'LOW';
      const utilization = days > 0 ? r2(spec.appointments.length / (days * 5 / 7)) : 0;
      const uniqueClients = new Set(spec.appointments.map(a => a.clientId)).size;

      return {
        specialistId:    spec.id,
        name:            spec.user ? `${spec.user.firstName} ${spec.user.lastName}` : '',
        department:      spec.department ?? 'COSMETOLOGY',
        compensationType: spec.compensationConfig?.type ?? 'COMMISSION_ONLY',
        revenue:         r2(revenue),
        paidRevenue:     r2(paidRev),
        laborCost:       r2(laborCost),
        roi,
        marginPct:       margin,
        completedApts:   spec.appointments.length,
        utilization,
        workedDays,
        absentDays,
        workedHours:     r2(workedHrs),
        uniqueClients,
        burnoutRisk:     burnout,
        dailyWorkload:   r2(dailyLoad),
        revenuePerApt:   spec.appointments.length > 0 ? r2(revenue / spec.appointments.length) : 0,
        revenuePerHour:  workedHrs > 0 ? r2(revenue / workedHrs) : null,
      };
    }).sort((a, b) => b.paidRevenue - a.paidRevenue);

    // ── Aggregate totals ───────────────────────────────────────────────────────
    const totalLaborCost  = specStats.reduce((s, sp) => s + sp.laborCost, 0);
    const totalRevenue    = specStats.reduce((s, sp) => s + sp.paidRevenue, 0);
    const laborCostPct    = totalRevenue > 0 ? r2(totalLaborCost / totalRevenue * 100) : 0;
    const avgRoi          = specStats.filter(s => s.roi !== null).reduce((s, sp) => s + (sp.roi ?? 0), 0)
                            / Math.max(1, specStats.filter(s => s.roi !== null).length);
    const highestEarner   = specStats[0] ?? null;
    const mostProfitable  = specStats.slice().sort((a, b) => (b.marginPct ?? 0) - (a.marginPct ?? 0))[0] ?? null;
    const burnoutRisks    = specStats.filter(s => s.burnoutRisk === 'HIGH');
    const underutilized   = specStats.filter(s => s.utilization < 2 && s.completedApts > 0);

    // ── Department breakdown ──────────────────────────────────────────────────
    const deptMap = new Map<string, { revenue: number; laborCost: number; headcount: number; completedApts: number }>();
    for (const sp of specStats) {
      const dept = sp.department;
      const cur = deptMap.get(dept) ?? { revenue: 0, laborCost: 0, headcount: 0, completedApts: 0 };
      cur.revenue      += sp.paidRevenue;
      cur.laborCost    += sp.laborCost;
      cur.headcount    += 1;
      cur.completedApts += sp.completedApts;
      deptMap.set(dept, cur);
    }
    const departmentBreakdown = Array.from(deptMap.entries()).map(([dept, d]) => ({
      department:   dept,
      headcount:    d.headcount,
      revenue:      r2(d.revenue),
      laborCost:    r2(d.laborCost),
      marginPct:    d.revenue > 0 ? r2((d.revenue - d.laborCost) / d.revenue * 100) : 0,
      completedApts: d.completedApts,
    })).sort((a, b) => b.revenue - a.revenue);

    // ── Payroll status summary ─────────────────────────────────────────────────
    const byStatus: Record<string, number> = {};
    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }
    const totalPendingPayout = records
      .filter(r => r.status === 'APPROVED')
      .reduce((s, r) => s + Number(r.netPayable), 0);

    return ok({
      period:      { from: from.toISOString(), to: to.toISOString(), days },
      summary: {
        totalLaborCost:    r2(totalLaborCost),
        totalRevenue:      r2(totalRevenue),
        laborCostPct,
        avgRoi:            r2(avgRoi),
        totalPendingPayout: r2(totalPendingPayout),
        activeSpecialists:  specialists.length,
        recordsByStatus:    byStatus,
      },
      insights: {
        highestEarner:    highestEarner ? { id: highestEarner.specialistId, name: highestEarner.name, laborCost: highestEarner.laborCost } : null,
        mostProfitable:   mostProfitable ? { id: mostProfitable.specialistId, name: mostProfitable.name, marginPct: mostProfitable.marginPct } : null,
        burnoutRisks:     burnoutRisks.map(s => ({ id: s.specialistId, name: s.name, dailyWorkload: s.dailyWorkload })),
        underutilized:    underutilized.map(s => ({ id: s.specialistId, name: s.name, utilization: s.utilization })),
        idlePayrollCost:  r2(underutilized.reduce((s, sp) => s + sp.laborCost, 0)),
      },
      departmentBreakdown,
      specialists: specStats,
    });
  } catch (err) {
    console.error('[payroll/analytics]', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate payroll analytics', 500);
  }
}
