export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  ok,
  checkAuth,
  apiError,
  SALON_TIMEZONE,
} from '@/app/api/analytics/dashboard/_utils';

// ─── Date range helpers ───────────────────────────────────────────────────────

type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Given a period and a YYYY-MM-DD date string (local to SALON_TIMEZONE),
 * returns UTC since/until covering the full period.
 */
function computeRange(period: Period, dateStr: string): { since: Date; until: Date } {
  // Parse year/month/day in local time (no timezone adjustment needed for calendar ops)
  const [y, m, d] = dateStr.split('-').map(Number);

  let localStart: string;
  let localEnd: string;

  switch (period) {
    case 'day':
      localStart = dateStr;
      localEnd = dateStr;
      break;

    case 'week': {
      // Monday of the week containing the date
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
      const daysFromMonday = dow === 0 ? 6 : dow - 1;
      const monDate = new Date(Date.UTC(y, m - 1, d - daysFromMonday));
      const sunDate = new Date(Date.UTC(y, m - 1, d + (6 - daysFromMonday)));
      localStart = monDate.toISOString().slice(0, 10);
      localEnd = sunDate.toISOString().slice(0, 10);
      break;
    }

    case 'month': {
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      localStart = `${y}-${String(m).padStart(2, '0')}-01`;
      localEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      break;
    }

    case 'quarter': {
      const qStart = Math.floor((m - 1) / 3) * 3 + 1; // 1, 4, 7, or 10
      const qEnd = qStart + 2;
      const lastDay = new Date(Date.UTC(y, qEnd, 0)).getUTCDate();
      localStart = `${y}-${String(qStart).padStart(2, '0')}-01`;
      localEnd = `${y}-${String(qEnd).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      break;
    }

    case 'year': {
      localStart = `${y}-01-01`;
      localEnd = `${y}-12-31`;
      break;
    }
  }

  // Convert local midnight to UTC using timezone offset at noon of that date
  function localDayToUtc(day: string, endOfDay = false): Date {
    const noonUtc = new Date(day + 'T12:00:00Z');
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SALON_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(noonUtc);
    const lh = Number(parts.find(p => p.type === 'hour')?.value ?? '12');
    const lm = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
    const offsetMs = (lh * 60 + lm - 12 * 60) * 60_000;
    const startMs = new Date(day + 'T00:00:00Z').getTime() - offsetMs;
    return endOfDay ? new Date(startMs + 86_400_000) : new Date(startMs);
  }

  return {
    since: localDayToUtc(localStart, false),
    until: localDayToUtc(localEnd, true),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const periodParam = (searchParams.get('period') ?? 'month') as Period;
  const dateParam =
    searchParams.get('date') ??
    new Date().toLocaleDateString('sv-SE', { timeZone: SALON_TIMEZONE });

  const validPeriods: Period[] = ['day', 'week', 'month', 'quarter', 'year'];
  if (!validPeriods.includes(periodParam)) {
    return apiError('BAD_REQUEST', 'Invalid period. Use day|week|month|quarter|year', 400);
  }

  const { since, until } = computeRange(periodParam, dateParam);

  console.log('[analytics/operations]', { period: periodParam, date: dateParam, since, until });

  try {
    // ── Fetch all appointments in range with includes ──────────────────────────
    const appointments = await prisma.appointment.findMany({
      where: { startAt: { gte: since, lt: until } },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        totalPrice: true,
        totalDuration: true,
        cancellationReason: true,
        specialistId: true,
        roomId: true,
        specialist: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        room: { select: { id: true, name: true } },
        services: {
          select: {
            price: true,
            duration: true,
            service: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
    });

    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const cancelled = appointments.filter(a => a.status === 'CANCELLED').length;
    const noShow = appointments.filter(a => a.status === 'NO_SHOW').length;

    const totalRevenue = appointments
      .filter(a => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + Number(a.totalPrice), 0);

    // ── Top procedures ─────────────────────────────────────────────────────────
    const procedureMap = new Map<
      string,
      { serviceId: string; serviceName: string; category: string; count: number; revenue: number }
    >();

    for (const apt of appointments) {
      for (const svc of apt.services) {
        const sid = svc.service.id;
        const existing = procedureMap.get(sid);
        const revenue = apt.status === 'COMPLETED' ? Number(svc.price) : 0;
        if (existing) {
          existing.count += 1;
          existing.revenue += revenue;
        } else {
          procedureMap.set(sid, {
            serviceId: sid,
            serviceName: svc.service.name,
            category: svc.service.category,
            count: 1,
            revenue,
          });
        }
      }
    }

    const topProcedures = Array.from(procedureMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(p => ({
        serviceId: p.serviceId,
        serviceName: p.serviceName,
        category: p.category,
        appointmentCount: p.count,
        revenue: p.revenue,
        avgPrice: p.count > 0 ? Math.round((p.revenue / p.count) * 100) / 100 : 0,
      }));

    // ── Top specialists ────────────────────────────────────────────────────────
    const specialistMap = new Map<
      string,
      { specialistId: string; name: string; count: number; completedCount: number; revenue: number }
    >();

    for (const apt of appointments) {
      const sid = apt.specialistId;
      const name = apt.specialist?.user
        ? `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`
        : 'Unknown';
      const isCompleted = apt.status === 'COMPLETED';
      const existing = specialistMap.get(sid);
      if (existing) {
        existing.count += 1;
        if (isCompleted) {
          existing.completedCount += 1;
          existing.revenue += Number(apt.totalPrice);
        }
      } else {
        specialistMap.set(sid, {
          specialistId: sid,
          name,
          count: 1,
          completedCount: isCompleted ? 1 : 0,
          revenue: isCompleted ? Number(apt.totalPrice) : 0,
        });
      }
    }

    const topSpecialists = Array.from(specialistMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(s => ({
        specialistId: s.specialistId,
        name: s.name,
        appointmentCount: s.count,
        completedCount: s.completedCount,
        revenue: s.revenue,
        utilizationRate: total > 0 ? Math.round((s.completedCount / total) * 1000) / 1000 : 0,
      }));

    // ── Peak hours (Yekaterinburg time = UTC+5) ───────────────────────────────
    const hourMap = new Map<number, number>();
    for (const apt of appointments) {
      const localHour = (apt.startAt.getUTCHours() + 5) % 24; // UTC+5
      hourMap.set(localHour, (hourMap.get(localHour) ?? 0) + 1);
    }

    const peakHours = Array.from(hourMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // ── Room utilization ───────────────────────────────────────────────────────
    const roomMap = new Map<
      string,
      { roomId: string; roomName: string; count: number; occupiedMinutes: number }
    >();

    for (const apt of appointments) {
      if (!apt.roomId || !apt.room) continue;
      const rid = apt.roomId;
      const existing = roomMap.get(rid);
      if (existing) {
        existing.count += 1;
        existing.occupiedMinutes += apt.totalDuration ?? 0;
      } else {
        roomMap.set(rid, {
          roomId: rid,
          roomName: apt.room.name,
          count: 1,
          occupiedMinutes: apt.totalDuration ?? 0,
        });
      }
    }

    const roomUtilization = Array.from(roomMap.values())
      .sort((a, b) => b.occupiedMinutes - a.occupiedMinutes)
      .slice(0, 10)
      .map(r => ({
        roomId: r.roomId,
        roomName: r.roomName,
        appointmentCount: r.count,
        occupiedMinutes: r.occupiedMinutes,
      }));

    // ── Cancellation reasons ───────────────────────────────────────────────────
    const reasonMap = new Map<string | null, number>();
    for (const apt of appointments) {
      if (apt.status !== 'CANCELLED') continue;
      const reason = apt.cancellationReason ?? null;
      const key = reason as string | null;
      reasonMap.set(key, (reasonMap.get(key) ?? 0) + 1);
    }

    const cancellationReasons = Array.from(reasonMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    // ── Build response ─────────────────────────────────────────────────────────
    return ok({
      period: periodParam,
      since: since.toISOString(),
      until: until.toISOString(),
      summary: {
        totalAppointments: total,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        noShowAppointments: noShow,
        cancellationRate: total > 0 ? Math.round((cancelled / total) * 1000) / 1000 : 0,
        noShowRate: total > 0 ? Math.round((noShow / total) * 1000) / 1000 : 0,
        totalRevenue,
        avgRevenuePerAppointment:
          completed > 0 ? Math.round((totalRevenue / completed) * 100) / 100 : 0,
      },
      topProcedures,
      topSpecialists,
      peakHours,
      roomUtilization,
      cancellationReasons,
    });
  } catch (err) {
    console.error('[analytics/operations] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to compute operational analytics', 500);
  }
}
