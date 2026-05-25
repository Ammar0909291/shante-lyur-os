export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

const CreateBookingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  serviceId: z.string().uuid(),
  specialistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  locationId: z.string().uuid(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request data', 400, {
        issues: parsed.error.issues,
      });
    }

    const { firstName, lastName, phone, email, serviceId, specialistId, date, time, locationId, notes } =
      parsed.data;

    // Find or create user by phone
    let user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          phone,
          email: email ?? '',
          role: 'CLIENT',
          status: 'ACTIVE',
          passwordHash: '',
        },
      });
    }

    // Get service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { baseDuration: true, basePrice: true, name: true },
    });
    if (!service) {
      return apiError('NOT_FOUND', 'Service not found', 404);
    }

    // Get specialist name
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!specialist) {
      return apiError('NOT_FOUND', 'Specialist not found', 404);
    }

    // Build start/end times
    const startAt = new Date(`${date}T${time}:00`);
    const endAt = new Date(startAt.getTime() + service.baseDuration * 60000);

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId: user.id,
        specialistId,
        locationId,
        startAt,
        endAt,
        totalPrice: service.basePrice,
        totalDuration: service.baseDuration,
        status: 'PENDING',
        source: 'web',
        notes: notes ?? null,
        services: {
          create: [
            {
              serviceId,
              price: service.basePrice,
              duration: service.baseDuration,
            },
          ],
        },
      },
    });

    return ok({
      appointmentId: appointment.id,
      startAt: appointment.startAt.toISOString(),
      serviceName: service.name,
      specialistName: `${specialist.user.firstName} ${specialist.user.lastName}`,
    });
  } catch {
    return apiError('INTERNAL_ERROR', 'Failed to create booking', 500);
  }
}
