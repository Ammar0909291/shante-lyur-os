export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { type SpecialistDepartment } from '@/app/api/specialists/_shared';
import {
  SALON_TIMEZONE,
  getTodayBounds,
  ok,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import type {
  TodayOperationsResponse,
  OperationalAppointment,
  OperationalStatus,
  LiveSpecialist,
  RoomStatus,
  OperationalAlert,
  AlertType,
  OperationalMetrics,
} from '@/types/operations';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_MASSAGE_TARGET = 6.0;
const NON_ACTIVE = ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: { toNumber(): number } | null | undefined): number {
  return v?.toNumber() ?? 0;
}

function deriveOperationalStatus(
  dbStatus: string,
  checkedInAt: Date | null,
  startAt: Date,
  now: Date,
): OperationalStatus {
  if (dbStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (dbStatus === 'COMPLETED') return 'COMPLETED';
  if (dbStatus === 'CANCELLED') return 'CANCELLED';
  if (dbStatus === 'NO_SHOW') return 'NO_SHOW';
  if (dbStatus === 'RESCHEDULED') return 'RESCHEDULED';

  if (checkedInAt) {
    return startAt <= now ? 'WAITING' : 'ARRIVED';
  }

  return dbStatus as OperationalStatus;
}

function deriveDelayMinutes(
  dbStatus: string,
  checkedInAt: Date | null,
  startAt: Date,
  now: Date,
): number {
  if (['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(dbStatus)) {
    return 0;
  }
  if (checkedInAt) return 0; // arrived — no "late" delay for the salon
  if (now <= startAt) return 0;
  return Math.max(0, Math.floor((now.getTime() - startAt.getTime()) / 60000));
}

function calcWaitMinutes(checkedInAt: Date | null, dbStatus: string, now: Date): number | null {
  if (!checkedInAt || dbStatus === 'IN_PROGRESS' || dbStatus === 'COMPLETED') return null;
  return Math.max(0, Math.floor((now.getTime() - checkedInAt.getTime()) / 60000));
}

function massageWeight(totalDuration: number): number {
  return totalDuration >= 85 ? 1.5 : 1.0;
}

// ─── Alert generation ─────────────────────────────────────────────────────────

let alertSeq = 0;
function makeAlert(
  type: AlertType,
  severity: 'critical' | 'warning' | 'info',
  message: string,
  opts: { appointmentId?: string; specialistId?: string } = {},
): OperationalAlert {
  return {
    id: `alert-${++alertSeq}`,
    type,
    severity,
    message,
    appointmentId: opts.appointmentId ?? null,
    specialistId: opts.specialistId ?? null,
    detectedAt: new Date().toISOString(),
  };
}

function generateAlerts(
  queue: OperationalAppointment[],
  now: Date,
): OperationalAlert[] {
  alertSeq = 0;
  const alerts: OperationalAlert[] = [];

  for (const apt of queue) {
    // Late client: scheduled but not arrived, 15+ min past startAt
    if (
      (apt.operationalStatus === 'CONFIRMED' || apt.operationalStatus === 'PENDING') &&
      apt.delayMinutes >= 15
    ) {
      alerts.push(makeAlert(
        'LATE_CLIENT',
        apt.delayMinutes >= 30 ? 'critical' : 'warning',
        `${apt.clientName} опаздывает на ${apt.delayMinutes} мин (${apt.specialistName})`,
        { appointmentId: apt.id, specialistId: apt.specialistId },
      ));
    }

    // Overrun procedure: IN_PROGRESS, past endAt by 10+ min
    if (apt.operationalStatus === 'IN_PROGRESS') {
      const endAt = new Date(apt.endAt);
      const overrun = Math.floor((now.getTime() - endAt.getTime()) / 60000);
      if (overrun >= 10) {
        alerts.push(makeAlert(
          'OVERRUN_PROCEDURE',
          overrun >= 25 ? 'critical' : 'warning',
          `Процедура у ${apt.specialistName} превышает план на ${overrun} мин`,
          { appointmentId: apt.id, specialistId: apt.specialistId },
        ));
      }
    }

    // Long wait: client arrived, waiting 20+ min
    if (
      (apt.operationalStatus === 'WAITING' || apt.operationalStatus === 'ARRIVED') &&
      (apt.waitMinutes ?? 0) >= 20
    ) {
      alerts.push(makeAlert(
        'LONG_WAIT',
        (apt.waitMinutes ?? 0) >= 40 ? 'critical' : 'warning',
        `${apt.clientName} ожидает ${apt.waitMinutes} мин`,
        { appointmentId: apt.id, specialistId: apt.specialistId },
      ));
    }
  }

  // Room conflicts: two IN_PROGRESS appointments sharing a room
  const roomActive = new Map<string, OperationalAppointment[]>();
  for (const apt of queue) {
    if (apt.operationalStatus === 'IN_PROGRESS' && apt.roomId) {
      const list = roomActive.get(apt.roomId) ?? [];
      list.push(apt);
      roomActive.set(apt.roomId, list);
    }
  }
  for (const [, apts] of roomActive.entries()) {
    if (apts.length >= 2) {
      alerts.push(makeAlert(
        'ROOM_CONFLICT',
        'critical',
        `Конфликт кабинета: ${apts.map(a => a.specialistName).join(' и ')} — одновременно в одном кабинете`,
        { appointmentId: apts[0].id },
      ));
    }
  }

  return alerts;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);
  const now = new Date();

  console.log('[ops/today] fetching', { todayStart, todayEnd, now });

  try {
    const [appointments, specialists, rooms] = await Promise.all([
      prisma.appointment.findMany({
        where: { startAt: { gte: todayStart, lt: todayEnd } },
        select: {
          id: true,
          clientId: true,
          specialistId: true,
          startAt: true,
          endAt: true,
          status: true,
          paymentStatus: true,
          totalPrice: true,
          totalDuration: true,
          checkedInAt: true,
          checkedOutAt: true,
          roomId: true,
          client: { select: { firstName: true, lastName: true } },
          specialist: {
            select: {
              department: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          services: {
            select: { service: { select: { name: true } } },
            orderBy: { sortOrder: 'asc' },
          },
          room: { select: { name: true, type: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
      prisma.specialist.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          department: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.room.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    type AptRow = typeof appointments[number];

    // ── Build operational appointment list ────────────────────────────────────
    const dateStr = todayStart.toLocaleDateString('sv-SE', { timeZone: SALON_TIMEZONE });

    const queue: OperationalAppointment[] = (appointments as AptRow[]).map(apt => {
      const opStatus = deriveOperationalStatus(
        apt.status as string,
        apt.checkedInAt,
        apt.startAt,
        now,
      );
      const delay = deriveDelayMinutes(apt.status as string, apt.checkedInAt, apt.startAt, now);
      const wait = calcWaitMinutes(apt.checkedInAt, apt.status as string, now);
      const specType = (apt.specialist.department ?? 'COSMETOLOGY') as SpecialistDepartment;

      return {
        id: apt.id,
        clientName: `${apt.client.firstName} ${apt.client.lastName}`,
        clientId: apt.clientId,
        specialistId: apt.specialistId,
        specialistName: `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`,
        specialistType: specType,
        services: apt.services.map(s => s.service.name),
        startAt: apt.startAt.toISOString(),
        endAt: apt.endAt.toISOString(),
        duration: apt.totalDuration,
        operationalStatus: opStatus,
        dbStatus: apt.status as string,
        checkedInAt: apt.checkedInAt?.toISOString() ?? null,
        checkedOutAt: apt.checkedOutAt?.toISOString() ?? null,
        roomId: apt.roomId,
        roomName: apt.room?.name ?? null,
        waitMinutes: wait,
        delayMinutes: delay,
        paymentStatus: apt.paymentStatus as string,
        revenue: toNum(apt.totalPrice),
      };
    });

    console.log('[ops/today] built queue', { count: queue.length, inProgress: queue.filter(a => a.operationalStatus === 'IN_PROGRESS').length });

    // ── Build specialist live status ───────────────────────────────────────────
    const aptsBySpec = new Map<string, OperationalAppointment[]>();
    for (const apt of queue) {
      const arr = aptsBySpec.get(apt.specialistId) ?? [];
      arr.push(apt);
      aptsBySpec.set(apt.specialistId, arr);
    }

    const liveSpecialists: LiveSpecialist[] = (specialists as typeof specialists).map(s => {
      const specType = (s.department ?? 'COSMETOLOGY') as SpecialistDepartment;
      const apts = aptsBySpec.get(s.id) ?? [];

      const activeApts = apts.filter(a => !NON_ACTIVE.includes(a.dbStatus as typeof NON_ACTIVE[number]));
      const inProgressApts = apts.filter(a => a.operationalStatus === 'IN_PROGRESS');
      const completedToday = apts.filter(a => a.operationalStatus === 'COMPLETED').length;
      const todayScheduled = activeApts.length;

      let liveStatus: LiveSpecialist['liveStatus'];
      if (inProgressApts.length >= 2) liveStatus = 'OVERBOOKED';
      else if (inProgressApts.length === 1) liveStatus = 'BUSY';
      else liveStatus = 'FREE';

      const currentAppointment = inProgressApts[0] ?? null;
      const nextAppointment = apts.find(
        a =>
          a.startAt > now.toISOString() &&
          (a.operationalStatus === 'CONFIRMED' || a.operationalStatus === 'PENDING' || a.operationalStatus === 'ARRIVED'),
      ) ?? null;

      // Massage workload weight
      const massageWt =
        specType === 'MASSAGE'
          ? activeApts.reduce((sum, a) => sum + massageWeight(a.duration), 0)
          : null;

      if (inProgressApts.length >= 2) {
        console.log('[ops/today] OVERBOOKED specialist', { specialistId: s.id, count: inProgressApts.length });
      }

      return {
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        type: specType,
        liveStatus,
        currentAppointment,
        nextAppointment,
        todayCompleted: completedToday,
        todayScheduled,
        massageWeight: massageWt,
        massageWeightTarget: specType === 'MASSAGE' ? DAILY_MASSAGE_TARGET : null,
      };
    });

    // ── Build room status ─────────────────────────────────────────────────────
    const aptsByRoom = new Map<string, OperationalAppointment[]>();
    for (const apt of queue) {
      if (apt.roomId) {
        const arr = aptsByRoom.get(apt.roomId) ?? [];
        arr.push(apt);
        aptsByRoom.set(apt.roomId, arr);
      }
    }

    type RoomRow = typeof rooms[number];
    const roomStatuses: RoomStatus[] = (rooms as RoomRow[]).map(room => {
      const roomApts = aptsByRoom.get(room.id) ?? [];
      const currentApt = roomApts.find(a => a.operationalStatus === 'IN_PROGRESS') ?? null;
      const isOccupied = currentApt !== null;
      const todayBookings = roomApts.filter(
        a => !NON_ACTIVE.includes(a.dbStatus as typeof NON_ACTIVE[number]),
      ).length;

      // Next available: find next apt that is not yet in progress
      const futureApts = roomApts
        .filter(
          a =>
            a.startAt > now.toISOString() &&
            !NON_ACTIVE.includes(a.dbStatus as typeof NON_ACTIVE[number]),
        )
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
      const nextAvailableAt = isOccupied
        ? (roomApts.find(a => a.operationalStatus === 'IN_PROGRESS')?.endAt ?? null)
        : (futureApts[0]?.startAt ?? null);

      return {
        id: room.id,
        name: room.name,
        type: room.type as 'MASSAGE' | 'COSMETOLOGY' | 'GENERAL',
        isOccupied,
        currentAppointment: currentApt,
        nextAvailableAt,
        todayBookings,
      };
    });

    // ── Metrics ───────────────────────────────────────────────────────────────
    const metricCounts = {
      pending: 0, confirmed: 0, arrived: 0, waiting: 0,
      inProgress: 0, completed: 0, cancelled: 0, noShow: 0,
    };
    let totalWait = 0, waitCount = 0;
    let totalDelay = 0, delayCount = 0;

    for (const apt of queue) {
      switch (apt.operationalStatus) {
        case 'PENDING': metricCounts.pending++; break;
        case 'CONFIRMED': metricCounts.confirmed++; break;
        case 'ARRIVED': metricCounts.arrived++; break;
        case 'WAITING': metricCounts.waiting++; break;
        case 'IN_PROGRESS': metricCounts.inProgress++; break;
        case 'COMPLETED': metricCounts.completed++; break;
        case 'CANCELLED': case 'RESCHEDULED': metricCounts.cancelled++; break;
        case 'NO_SHOW': metricCounts.noShow++; break;
      }
      if (apt.waitMinutes !== null) { totalWait += apt.waitMinutes; waitCount++; }
      if (apt.delayMinutes > 0) { totalDelay += apt.delayMinutes; delayCount++; }
    }

    const totalNonCancelled = queue.length - metricCounts.cancelled - metricCounts.noShow;
    const occupancyRate =
      queue.length > 0
        ? Math.round((metricCounts.inProgress + metricCounts.completed) / Math.max(1, totalNonCancelled) * 100)
        : 0;

    const metrics: OperationalMetrics = {
      totalBookings: queue.length,
      ...metricCounts,
      avgWaitMinutes: waitCount > 0 ? Math.round(totalWait / waitCount) : 0,
      avgDelayMinutes: delayCount > 0 ? Math.round(totalDelay / delayCount) : 0,
      occupancyRate,
    };

    // ── Alerts ────────────────────────────────────────────────────────────────
    const alerts = generateAlerts(queue, now);

    // Massage overload check
    for (const spec of liveSpecialists) {
      if (spec.type === 'MASSAGE' && (spec.massageWeight ?? 0) >= DAILY_MASSAGE_TARGET) {
        alerts.push(makeAlert(
          'MASSAGE_OVERLOAD',
          'warning',
          `${spec.name}: нагрузка ${(spec.massageWeight ?? 0).toFixed(1)} / ${DAILY_MASSAGE_TARGET} ед. — план выполнен`,
          { specialistId: spec.id },
        ));
      }
    }

    console.log('[ops/today] done', { alerts: alerts.length, metrics });

    const result: TodayOperationsResponse = {
      date: dateStr,
      generatedAt: now.toISOString(),
      metrics,
      queue,
      specialists: liveSpecialists,
      rooms: roomStatuses,
      alerts,
    };

    return ok<TodayOperationsResponse>(result);
  } catch (err) {
    console.error('[ops/today] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to load today operations', 500);
  }
}
