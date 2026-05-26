export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import bcrypt from 'bcryptjs';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

interface BookingBody {
  specialistId: string;
  serviceId:    string;
  date:         string;   // YYYY-MM-DD
  time:         string;   // HH:MM
  firstName:    string;
  lastName:     string;
  phone:        string;
}

export async function POST(req: NextRequest) {
  let body: BookingBody;
  try {
    body = await req.json() as BookingBody;
  } catch {
    return err('Invalid JSON');
  }

  const { specialistId, serviceId, date, time, firstName, lastName, phone } = body;
  if (!specialistId || !serviceId || !date || !time || !firstName || !phone) {
    return err('specialistId, serviceId, date, time, firstName, phone are required');
  }

  // Validate specialist
  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!specialist) return err('Specialist not found', 404);

  // Validate service
  const svcLink = await prisma.specialistService.findUnique({
    where: { specialistId_serviceId: { specialistId, serviceId } },
    select: {
      priceOverride: true,
      durationOverride: true,
      service: { select: { id: true, name: true, baseDuration: true, basePrice: true } },
    },
  });
  if (!svcLink) return err('Service not available for this specialist', 404);

  const duration = svcLink.durationOverride ?? svcLink.service.baseDuration;
  const price    = svcLink.priceOverride    ?? svcLink.service.basePrice;

  // Build startAt / endAt (treat provided time as UTC — salon uses Asia/Yekaterinburg = UTC+5,
  // so the caller should send UTC equivalent; for simplicity we accept as-is UTC)
  const startAt = new Date(`${date}T${time}:00.000Z`);
  const endAt   = new Date(startAt.getTime() + duration * 60_000);

  if (isNaN(startAt.getTime())) return err('Invalid date/time');

  // Check slot still available
  const conflict = await prisma.appointment.findFirst({
    where: {
      specialistId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startAt: { lt: endAt },
      endAt:   { gt: startAt },
    },
  });
  if (conflict) return err('This time slot is no longer available. Please choose another.', 409);

  // Find / create client user by phone
  const cleanPhone = phone.replace(/\s/g, '');
  let clientUser = await prisma.user.findFirst({ where: { phone: cleanPhone } });
  if (!clientUser) {
    const tempEmail = `guest_${cleanPhone.replace(/\D/g, '')}_${Date.now()}@shante-lyur.guest`;
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 4);
    clientUser = await prisma.user.create({
      data: {
        email:        tempEmail,
        passwordHash,
        firstName:    firstName.trim(),
        lastName:     (lastName ?? '').trim() || '—',
        phone:        cleanPhone,
        role:         'CLIENT',
        status:       'ACTIVE',
        emailVerified: false,
        phoneVerified: false,
      },
    });
    await prisma.customerProfile.create({ data: { userId: clientUser.id } });
  }

  // Get default location
  const location = await prisma.location.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!location) return err('No active location configured', 500);

  // Find a free room for the time slot
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
    where: {
      locationId: location.id,
      isActive:   true,
      id:         { notIn: busyRoomIds },
    },
  });

  // Create appointment in a transaction
  const appointment = await prisma.$transaction(async (tx) => {
    // Double-check conflict inside transaction
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
        clientId:      clientUser!.id,
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
  });

  return ok({
    appointmentId: appointment.id,
    message: 'Запись успешно создана! Мы свяжемся с вами для подтверждения.',
  });
}
