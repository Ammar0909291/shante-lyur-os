export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  ok,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';

/** GET /api/operations/my-schedule — today's schedule for the authenticated specialist. */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  if (!userId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  // Only specialists (and admins previewing) can call this
  if (!['SPECIALIST', 'ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(role)) {
    return apiError('FORBIDDEN', 'Not authorized', 403);
  }

  try {
    // Resolve specialist record from userId
    const specialist = await prisma.specialist.findFirst({
      where: { userId },
      select: {
        id: true,
        specialization: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!specialist) return apiError('NOT_FOUND', 'Specialist profile not found', 404);

    const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
    const now = new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        specialistId: specialist.id,
        startAt: { gte: todayStart, lt: todayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
      },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        totalDuration: true,
        totalPrice: true,
        notes: true,
        checkedInAt: true,
        checkedOutAt: true,
        roomId: true,
        room: { select: { name: true, type: true } },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            customerProfile: {
              select: {
                loyaltyTier: true,
                totalVisits: true,
                notes: true,
                allergies: { select: { allergen: true, severity: true } },
              },
            },
          },
        },
        services: {
          select: { service: { select: { id: true, name: true, category: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    // Derive operational status
    const queue = appointments.map((apt) => {
      let opStatus: string;
      if (apt.status === 'IN_PROGRESS') opStatus = 'IN_PROGRESS';
      else if (apt.status === 'COMPLETED') opStatus = 'COMPLETED';
      else if (apt.checkedInAt) {
        opStatus = apt.startAt <= now ? 'WAITING' : 'ARRIVED';
      } else {
        opStatus = apt.status;
      }

      const waitMinutes = apt.checkedInAt && apt.status !== 'IN_PROGRESS' && apt.status !== 'COMPLETED'
        ? Math.max(0, Math.floor((now.getTime() - apt.checkedInAt.getTime()) / 60000))
        : null;

      const progressPct = apt.status === 'IN_PROGRESS' && apt.checkedInAt
        ? Math.min(100, Math.round(
            (now.getTime() - apt.checkedInAt.getTime()) /
            (apt.endAt.getTime() - apt.startAt.getTime()) * 100
          ))
        : null;

      return {
        id: apt.id,
        dbStatus: apt.status,
        operationalStatus: opStatus,
        startAt: apt.startAt.toISOString(),
        endAt: apt.endAt.toISOString(),
        duration: apt.totalDuration,
        revenue: Number(apt.totalPrice),
        notes: apt.notes,
        checkedInAt: apt.checkedInAt?.toISOString() ?? null,
        checkedOutAt: apt.checkedOutAt?.toISOString() ?? null,
        roomId: apt.roomId,
        roomName: apt.room?.name ?? null,
        roomType: apt.room?.type ?? null,
        waitMinutes,
        progressPct,
        client: {
          id: apt.client.id,
          name: `${apt.client.firstName} ${apt.client.lastName}`,
          phone: apt.client.phone,
          loyaltyTier: apt.client.customerProfile?.loyaltyTier ?? null,
          totalVisits: apt.client.customerProfile?.totalVisits ?? 0,
          notes: apt.client.customerProfile?.notes ?? null,
          allergies: apt.client.customerProfile?.allergies ?? [],
        },
        services: apt.services.map((s) => ({ id: s.service.id, name: s.service.name, category: s.service.category })),
      };
    });

    const currentAppointment = queue.find((a) => a.operationalStatus === 'IN_PROGRESS') ?? null;
    const nextAppointment = queue.find(
      (a) => ['CONFIRMED', 'PENDING', 'ARRIVED', 'WAITING'].includes(a.operationalStatus) && a.startAt > now.toISOString()
    ) ?? null;
    const arrivedWaiting = queue.filter((a) => a.operationalStatus === 'ARRIVED' || a.operationalStatus === 'WAITING');
    const completedToday = queue.filter((a) => a.operationalStatus === 'COMPLETED').length;

    return ok({
      specialist: {
        id: specialist.id,
        name: `${specialist.user.firstName} ${specialist.user.lastName}`,
        specialization: specialist.specialization,
      },
      date: todayStart.toLocaleDateString('sv-SE', { timeZone: SALON_TIMEZONE }),
      queue,
      currentAppointment,
      nextAppointment,
      arrivedWaiting,
      completedToday,
      totalToday: queue.length,
    });
  } catch (err) {
    console.error('[my-schedule] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to load schedule', 500);
  }
}
