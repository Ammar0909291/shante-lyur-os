export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { triggerBookingConfirmation } from '@/lib/communication/booking-triggers';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

interface BookingBody {
  specialistId: string;
  serviceId:    string;
  date:         string;   // YYYY-MM-DD
  time:         string;   // HH:MM
  phone:        string;
}

export async function POST(req: NextRequest) {
  let body: BookingBody;
  try { body = await req.json() as BookingBody; }
  catch { return err('Invalid JSON'); }

  const { specialistId, serviceId, date, time, phone } = body;
  if (!specialistId || !serviceId || !date || !time || !phone) {
    return err('specialistId, serviceId, date, time, phone are required');
  }

  // Verify existing client — only registered CLIENT users may book online
  const cleanPhone = phone.replace(/\s/g, '');
  const clientUser = await prisma.user.findFirst({
    where: { phone: cleanPhone, role: 'CLIENT', status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!clientUser) {
    return err('Этот номер не зарегистрирован. Обратитесь к администратору для записи.', 403);
  }

  // Validate specialist (include user info for notification)
  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId, status: 'ACTIVE' },
    select: { id: true, department: true, user: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!specialist) return err('Specialist not found', 404);

  // Validate service link
  const svcLink = await prisma.specialistService.findUnique({
    where: { specialistId_serviceId: { specialistId, serviceId } },
    select: {
      priceOverride:    true,
      durationOverride: true,
      service: { select: { id: true, name: true, baseDuration: true, basePrice: true } },
    },
  });
  if (!svcLink) return err('Service not available for this specialist', 404);

  const duration = svcLink.durationOverride ?? svcLink.service.baseDuration;
  const price    = svcLink.priceOverride    ?? svcLink.service.basePrice;

  const startAt = new Date(`${date}T${time}:00.000Z`);
  const endAt   = new Date(startAt.getTime() + duration * 60_000);
  if (isNaN(startAt.getTime())) return err('Invalid date/time');

  // Quick pre-check before entering transaction
  const conflict = await prisma.appointment.findFirst({
    where: {
      specialistId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startAt: { lt: endAt },
      endAt:   { gt: startAt },
    },
  });
  if (conflict) return err('Это время уже занято. Пожалуйста, выберите другой слот.', 409);

  // Default location
  const location = await prisma.location.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!location) return err('No active location configured', 500);

  // Find a free room
  const busyRoomIds = (await prisma.appointment.findMany({
    where: {
      locationId: location.id,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startAt: { lt: endAt },
      endAt:   { gt: startAt },
      roomId:  { not: null },
    },
    select: { roomId: true },
  })).map((a) => a.roomId as string);

  const freeRoom = await prisma.room.findFirst({
    where: { locationId: location.id, isActive: true, id: { notIn: busyRoomIds } },
    select: { id: true, name: true },
  });

  // Atomic create with double-check
  const appointment = await prisma.$transaction(async (tx) => {
    const doubleCheck = await tx.appointment.findFirst({
      where: {
        specialistId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        startAt: { lt: endAt },
        endAt:   { gt: startAt },
      },
    });
    if (doubleCheck) throw new Error('SLOT_TAKEN');

    const appt = await tx.appointment.create({
      data: {
        clientId:      clientUser.id,
        specialistId,
        locationId:    location.id,
        roomId:        freeRoom?.id ?? null,
        startAt,
        endAt,
        status:        'PENDING',
        totalPrice:    price,
        totalDuration: duration,
        source:        'web',
      },
    });

    await tx.appointmentService.create({
      data: {
        appointmentId: appt.id,
        serviceId:     svcLink.service.id,
        price,
        duration,
        sortOrder:     0,
      },
    });

    return appt;
  }).catch((e: Error) => {
    if (e.message === 'SLOT_TAKEN') throw e;
    throw e;
  });

  // Fire booking confirmation notification (non-blocking)
  const dateLabel = startAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const timeLabel = `${String(startAt.getUTCHours()).padStart(2, '0')}:${String(startAt.getUTCMinutes()).padStart(2, '0')}`;
  triggerBookingConfirmation({
    appointmentId:    appointment.id,
    clientUserId:     clientUser.id,
    specialistUserId: specialist.user?.id,
    clientName:       `${clientUser.firstName} ${clientUser.lastName}`,
    specialistName:   specialist.user ? `${specialist.user.firstName} ${specialist.user.lastName}` : 'Специалист',
    serviceName:      svcLink.service.name,
    department:       specialist.department ?? undefined,
    date:             dateLabel,
    time:             timeLabel,
    room:             freeRoom?.name ?? undefined,
  }).catch((e) => console.warn('[booking/create] triggerBookingConfirmation failed:', e));

  return ok({
    appointmentId: appointment.id,
    message: 'Запись успешно создана! Мы свяжемся с вами для подтверждения.',
  });
}
