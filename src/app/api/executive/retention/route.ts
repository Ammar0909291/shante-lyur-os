export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function r2(n: number) { return Math.round(n * 100) / 100; }

// ─── GET /api/executive/retention ────────────────────────────────────────────
// Client retention intelligence: VIPs, at-risk, churn, return probability
// Query: ?period=30|60|90|180 (default 90)

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const period = Math.min(365, Math.max(30, Number(req.nextUrl.searchParams.get('period') ?? '90')));
  const now    = new Date();
  const from   = new Date(now.getTime() - period * 86_400_000);
  const prev   = new Date(from.getTime() - period * 86_400_000);

  console.log('[executive/retention]', { period });

  try {
    const [clients, allCompletedApts] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'CLIENT' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          clientAppointments: {
            where: { status: 'COMPLETED' },
            select: {
              id: true,
              startAt: true,
              totalPrice: true,
              paidAmount: true,
              specialistId: true,
              specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { startAt: 'desc' },
          },
        },
      }),
      prisma.appointment.findMany({
        where: { status: 'COMPLETED', startAt: { gte: prev, lte: now } },
        select: { clientId: true, startAt: true, totalPrice: true },
      }),
    ]);

    // ── Segment clients ────────────────────────────────────────────────────────
    const vips: { id: string; name: string; visits: number; totalSpent: number; lastVisit: string; preferredSpecialist: string | null; returnProbability: number }[] = [];
    const atRisk: { id: string; name: string; lastVisit: string; daysSince: number; visits: number; totalSpent: number; returnProbability: number }[] = [];
    const inactive: { id: string; name: string; lastVisit: string; daysSince: number; totalSpent: number }[] = [];
    const newClients: { id: string; name: string; firstVisit: string; visits: number }[] = [];

    // Monthly series for retention trend chart
    const monthMap = new Map<string, { returning: number; new: number; total: number }>();

    for (const client of clients) {
      const apts    = client.clientAppointments;
      if (apts.length === 0) continue;

      const sortedApts = [...apts].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      const lastApt    = apts[0]; // ordered desc
      const firstApt   = sortedApts[0];
      const lastVisit  = lastApt.startAt;
      const firstVisit = firstApt.startAt;
      const daysSince  = Math.floor((now.getTime() - lastVisit.getTime()) / 86_400_000);
      const totalSpent = apts.reduce((s, a) => s + Number(a.paidAmount), 0);

      // Visits in current vs prev period
      const visitsInPeriod = apts.filter(a => a.startAt >= from && a.startAt <= now).length;
      const visitsInPrev   = apts.filter(a => a.startAt >= prev && a.startAt < from).length;

      // Return probability: based on visit frequency and recency
      const avgInterval = apts.length > 1
        ? (lastVisit.getTime() - firstVisit.getTime()) / (apts.length - 1) / 86_400_000
        : 60;
      const returnProbability = Math.min(100, r2(
        (daysSince <= avgInterval ? 80 : daysSince <= avgInterval * 2 ? 50 : daysSince <= avgInterval * 3 ? 25 : 5)
        + (apts.length > 3 ? 10 : 0)
      ));

      // VIP: 3+ visits in period and significant spend
      if (visitsInPeriod >= 3 && totalSpent >= 10000) {
        const spec = apts[0]?.specialist;
        const specCounts = new Map<string, number>();
        for (const a of apts) if (a.specialistId) specCounts.set(a.specialistId, (specCounts.get(a.specialistId) ?? 0) + 1);
        const topSpec = [...specCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        const topSpecApt = topSpec ? apts.find(a => a.specialistId === topSpec[0]) : null;
        const preferredSpec = topSpecApt?.specialist ? `${topSpecApt.specialist.user.firstName} ${topSpecApt.specialist.user.lastName}` : (spec ? `${spec.user.firstName} ${spec.user.lastName}` : null);
        vips.push({ id: client.id, name: `${client.firstName} ${client.lastName}`, visits: apts.length, totalSpent: r2(totalSpent), lastVisit: lastVisit.toISOString().split('T')[0], preferredSpecialist: preferredSpec, returnProbability });
      }

      // At-risk: visited in prev period but not current
      if (visitsInPrev > 0 && visitsInPeriod === 0 && daysSince > 30 && daysSince < 180) {
        atRisk.push({ id: client.id, name: `${client.firstName} ${client.lastName}`, lastVisit: lastVisit.toISOString().split('T')[0], daysSince, visits: apts.length, totalSpent: r2(totalSpent), returnProbability });
      }

      // Inactive: no visit in 90+ days
      if (daysSince >= 90) {
        inactive.push({ id: client.id, name: `${client.firstName} ${client.lastName}`, lastVisit: lastVisit.toISOString().split('T')[0], daysSince, totalSpent: r2(totalSpent) });
      }

      // New clients: first visit in current period
      if (firstVisit >= from && visitsInPeriod > 0) {
        newClients.push({ id: client.id, name: `${client.firstName} ${client.lastName}`, firstVisit: firstVisit.toISOString().split('T')[0], visits: visitsInPeriod });
      }
    }

    // ── Monthly retention trend ───────────────────────────────────────────────
    for (const apt of allCompletedApts) {
      const month = apt.startAt.toISOString().slice(0, 7);
      if (!monthMap.has(month)) monthMap.set(month, { returning: 0, new: 0, total: 0 });
      const entry = monthMap.get(month)!;
      entry.total++;
      // Simplified: returning = visited before this month
      const clientHistory = clients.find(c => c.id === apt.clientId);
      const hasHistoryBefore = clientHistory?.clientAppointments.some(
        a => a.startAt < new Date(month + '-01')
      );
      if (hasHistoryBefore) entry.returning++;
      else entry.new++;
    }

    const retentionTrend = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({
        month,
        total:     v.total,
        returning: v.returning,
        new:       v.new,
        rate:      v.total > 0 ? r2(v.returning / v.total * 100) : 0,
      }));

    // ── Overall retention score ────────────────────────────────────────────────
    const totalActive   = clients.filter(c => c.clientAppointments.some(a => a.startAt >= from)).length;
    const totalReturning = clients.filter(c => {
      const inPeriod = c.clientAppointments.filter(a => a.startAt >= from).length;
      const inPrev   = c.clientAppointments.filter(a => a.startAt >= prev && a.startAt < from).length;
      return inPeriod > 0 && inPrev > 0;
    }).length;
    const overallRetentionRate = totalActive > 0 ? r2(totalReturning / totalActive * 100) : 0;

    // Sort: most at-risk (low probability) first
    atRisk.sort((a, b) => a.returnProbability - b.returnProbability);
    vips.sort((a, b) => b.totalSpent - a.totalSpent);
    inactive.sort((a, b) => b.daysSince - a.daysSince);

    console.log('[executive/retention] done', {
      vips: vips.length, atRisk: atRisk.length, inactive: inactive.length, newClients: newClients.length,
    });

    return ok({
      period,
      summary: {
        totalActiveClients:    totalActive,
        returningClients:      totalReturning,
        newClients:            newClients.length,
        atRiskClients:         atRisk.length,
        inactiveClients:       Math.min(inactive.length, 50),
        vipClients:            vips.length,
        overallRetentionRate,
      },
      segments: {
        vips:      vips.slice(0, 20),
        atRisk:    atRisk.slice(0, 20),
        inactive:  inactive.slice(0, 20),
        newClients: newClients.slice(0, 20),
      },
      retentionTrend,
    });
  } catch (err) {
    console.error('[executive/retention] error', err);
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Retention analysis failed', 500);
  }
}
