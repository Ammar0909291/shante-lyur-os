export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  pct,
  ok,
  apiError,
  checkAuth,
} from '@/app/api/analytics/dashboard/_utils';
import type {
  SpecialistPerformanceDetail,
  ServiceCategoryBreakdown,
  DailySessionPoint,
  TopService,
} from '@/types/analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

function get30DayBounds(): { from: Date; to: Date } {
  const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
  const from = new Date(todayStart.getTime() - 29 * 86_400_000);
  return { from, to: todayEnd };
}

function toNum(v: { toNumber(): number } | null | undefined): number {
  return v?.toNumber() ?? 0;
}

function calcCompliance(
  appointments: { startAt: Date; totalDuration: number }[],
  timezone: string,
): number | null {
  const TARGET_MINUTES = 360;
  const byDay = new Map<string, number>();
  for (const apt of appointments) {
    const dayKey = apt.startAt.toLocaleDateString('sv-SE', { timeZone: timezone });
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + apt.totalDuration);
  }
  if (byDay.size === 0) return 0;
  let compliant = 0;
  for (const total of byDay.values()) {
    if (total >= TARGET_MINUTES) compliant++;
  }
  return Math.round((compliant / byDay.size) * 100);
}

// Generate zero-filled daily session array for the given date range
function buildDailyPoints(
  appointments: { startAt: Date; totalPrice: { toNumber(): number }; totalDuration: number }[],
  from: Date,
  to: Date,
  timezone: string,
): DailySessionPoint[] {
  const byDay = new Map<string, { count: number; revenue: number }>();
  for (const apt of appointments) {
    const dayKey = apt.startAt.toLocaleDateString('sv-SE', { timeZone: timezone });
    const existing = byDay.get(dayKey) ?? { count: 0, revenue: 0 };
    byDay.set(dayKey, {
      count: existing.count + 1,
      revenue: existing.revenue + apt.totalPrice.toNumber(),
    });
  }

  const points: DailySessionPoint[] = [];
  const cursor = new Date(from);
  while (cursor < to) {
    const dayKey = cursor.toLocaleDateString('sv-SE', { timeZone: timezone });
    const entry = byDay.get(dayKey) ?? { count: 0, revenue: 0 };
    points.push({ date: dayKey, count: entry.count, revenue: entry.revenue });
    cursor.setTime(cursor.getTime() + 86_400_000);
  }
  return points;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id: specialistId } = await params;

  const bounds = get30DayBounds();
  const { searchParams } = request.nextUrl;
  const from = parseDateParam(searchParams.get('from'), bounds.from);
  const to = parseDateParam(searchParams.get('to'), bounds.to);

  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime());

  try {
    // Validate specialist exists
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
      select: {
        id: true,
        specialization: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!specialist) {
      return apiError('NOT_FOUND', 'Specialist not found', 404);
    }

    const specialistType = deriveSpecialistType(specialist.specialization);

    // Fetch current period completed appointments with service breakdown
    const [currentApts, prevApts] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          specialistId,
          startAt: { gte: from, lt: to },
          status: 'COMPLETED',
        },
        select: {
          id: true,
          clientId: true,
          totalPrice: true,
          totalDuration: true,
          startAt: true,
          services: {
            select: {
              price: true,
              duration: true,
              service: { select: { id: true, name: true, category: true } },
            },
          },
        },
      }),
      prisma.appointment.findMany({
        where: {
          specialistId,
          startAt: { gte: prevFrom, lt: prevTo },
          status: 'COMPLETED',
        },
        select: { totalPrice: true },
      }),
    ]);

    // ── Summary metrics ──
    const totalSessions = currentApts.length;
    const revenueGenerated = currentApts.reduce((s, a) => s + toNum(a.totalPrice), 0);
    const avgSessionDuration =
      totalSessions > 0
        ? Math.round(currentApts.reduce((s, a) => s + a.totalDuration, 0) / totalSessions)
        : 0;

    const uniqueClientSet = new Set(currentApts.map(a => a.clientId));
    const totalUniqueClients = uniqueClientSet.size;
    const repeatClientCount = [...uniqueClientSet].filter(
      cid => currentApts.filter(a => a.clientId === cid).length >= 2,
    ).length;
    const clientRetentionRate =
      totalUniqueClients > 0 ? Math.round((repeatClientCount / totalUniqueClients) * 100) : 0;
    const repeatClientRatio =
      totalUniqueClients > 0 ? Math.round((repeatClientCount / totalUniqueClients) * 100) : 0;

    const prevRevenue = prevApts.reduce((s, a) => s + toNum(a.totalPrice), 0);
    const trendVsLastMonth = pct(revenueGenerated, prevRevenue);

    const workloadCompliance =
      specialistType === 'COSMETOLOGY'
        ? null
        : calcCompliance(currentApts, SALON_TIMEZONE);

    // ── byServiceCategory ──
    const catMap = new Map<
      string,
      { sessionCount: number; revenue: number; durationTotal: number }
    >();
    for (const apt of currentApts) {
      for (const svc of apt.services) {
        const cat = svc.service.category as string;
        const existing = catMap.get(cat) ?? { sessionCount: 0, revenue: 0, durationTotal: 0 };
        catMap.set(cat, {
          sessionCount: existing.sessionCount + 1,
          revenue: existing.revenue + toNum(svc.price),
          durationTotal: existing.durationTotal + svc.duration,
        });
      }
    }
    const byServiceCategory: ServiceCategoryBreakdown[] = [...catMap.entries()].map(
      ([category, v]) => ({
        category,
        sessionCount: v.sessionCount,
        revenue: v.revenue,
        avgDuration: v.sessionCount > 0 ? Math.round(v.durationTotal / v.sessionCount) : 0,
      }),
    );

    // ── topServices ──
    const svcMap = new Map<string, { name: string; sessionCount: number; revenue: number }>();
    for (const apt of currentApts) {
      for (const svc of apt.services) {
        const existing = svcMap.get(svc.service.id) ?? {
          name: svc.service.name,
          sessionCount: 0,
          revenue: 0,
        };
        svcMap.set(svc.service.id, {
          name: svc.service.name,
          sessionCount: existing.sessionCount + 1,
          revenue: existing.revenue + toNum(svc.price),
        });
      }
    }
    const topServices: TopService[] = [...svcMap.entries()]
      .map(([serviceId, v]) => ({
        serviceId,
        serviceName: v.name,
        sessionCount: v.sessionCount,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 10);

    // ── dailySessions — exactly 30 entries, zero-filled ──
    const dailySessions: DailySessionPoint[] = buildDailyPoints(
      currentApts,
      from,
      to,
      SALON_TIMEZONE,
    );

    const detail: SpecialistPerformanceDetail = {
      id: specialist.id,
      name: `${specialist.user.firstName} ${specialist.user.lastName}`,
      specialistType,
      totalSessions,
      revenueGenerated,
      avgSessionDuration,
      clientRetentionRate,
      workloadCompliance,
      trendVsLastMonth,
      byServiceCategory,
      dailySessions,
      topServices,
      repeatClientRatio,
      totalUniqueClients,
    };

    return ok<SpecialistPerformanceDetail>(detail);
  } catch (err) {
    console.error(`[analytics/specialists/${specialistId}/performance] error`, err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch specialist performance', 500);
  }
}
