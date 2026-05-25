export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const specialistId = params.get('specialistId');
    const serviceId = params.get('serviceId');
    const date = params.get('date');

    if (!specialistId || !serviceId || !date) {
      return apiError('VALIDATION_ERROR', 'specialistId, serviceId, and date are required', 400);
    }

    // Get service duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { baseDuration: true },
    });
    if (!service) {
      return apiError('NOT_FOUND', 'Service not found', 404);
    }

    // Determine day of week
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dow = days[new Date(date + 'T12:00:00').getDay()];

    const parsedDate = new Date(date + 'T12:00:00');

    // Get working schedule
    const schedule = await prisma.workingSchedule.findFirst({
      where: {
        specialistId,
        dayOfWeek: dow as 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY',
        isActive: true,
        validFrom: { lte: parsedDate },
        OR: [{ validUntil: null }, { validUntil: { gte: parsedDate } }],
      },
      include: { location: { select: { id: true, name: true } } },
    });

    if (!schedule) {
      return ok({ slots: [], locationId: null, locationName: null });
    }

    // Generate candidate slots
    const startMinutes = timeToMinutes(schedule.startTime);
    const endMinutes = timeToMinutes(schedule.endTime);
    const duration = service.baseDuration;
    const breakStart = schedule.breakStart ? timeToMinutes(schedule.breakStart) : null;
    const breakEnd = schedule.breakEnd ? timeToMinutes(schedule.breakEnd) : null;

    const candidateSlots: string[] = [];
    for (let t = startMinutes; t + duration <= endMinutes; t += 30) {
      candidateSlots.push(minutesToTime(t));
    }

    // Get existing appointments for that day
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        specialistId,
        startAt: { gte: startOfDay, lt: endOfDay },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { startAt: true, endAt: true },
    });

    const nowMinutes = (() => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (today === date) {
        return now.getHours() * 60 + now.getMinutes();
      }
      return -1;
    })();

    const slots = candidateSlots.filter((slot) => {
      const slotStart = timeToMinutes(slot);
      const slotEnd = slotStart + duration;

      // Filter past slots
      if (nowMinutes >= 0 && slotStart <= nowMinutes) return false;

      // Filter break window
      if (breakStart !== null && breakEnd !== null) {
        if (slotStart < breakEnd && slotEnd > breakStart) return false;
      }

      // Filter overlapping appointments
      for (const appt of existingAppointments) {
        const apptStart = appt.startAt.getHours() * 60 + appt.startAt.getMinutes();
        const apptEnd = appt.endAt.getHours() * 60 + appt.endAt.getMinutes();
        if (slotStart < apptEnd && slotEnd > apptStart) return false;
      }

      return true;
    });

    return ok({
      slots,
      locationId: schedule.location.id,
      locationName: schedule.location.name,
    });
  } catch {
    return apiError('INTERNAL_ERROR', 'Failed to fetch slots', 500);
  }
}
