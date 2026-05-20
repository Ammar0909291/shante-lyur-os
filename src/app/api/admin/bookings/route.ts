export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  specialistId: z.string().uuid().optional(),
});

const CreateSchema = z.object({
  clientId: z.string().uuid(),
  specialistId: z.string().uuid(),
  locationId: z.string().uuid(),
  startAt: z.coerce.date(),
  services: z.array(z.object({
    serviceId: z.string().uuid(),
    price: z.number().nonnegative(),
    duration: z.number().int().positive(),
    sortOrder: z.number().int().min(0).default(0),
  })).min(1),
  notes: z.string().max(2000).optional(),
  source: z.enum(['web', 'phone', 'walkin', 'admin']).default('admin'),
});

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((v, k) => { raw[k] = v; });

    const parsed = ListSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query', 400, { issues: parsed.error.issues });
    }

    const { page, limit, from, to, status, specialistId } = parsed.data;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (specialistId) where.specialistId = specialistId;
    if (from || to) {
      where.startAt = {};
      if (from) (where.startAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startAt as Record<string, unknown>).lte = new Date(to);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          client: { select: { id: true, firstName: true, lastName: true, email: true } },
          specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
          services: { include: { service: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    const items = appointments.map((a) => ({
      id: a.id,
      clientId: a.clientId,
      clientName: `${a.client.firstName} ${a.client.lastName}`,
      clientEmail: a.client.email,
      specialistId: a.specialistId,
      specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
      locationId: a.locationId,
      locationName: a.location.name,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      totalPrice: Number(a.totalPrice),
      totalDuration: a.totalDuration,
      notes: a.notes,
      services: a.services.map((s) => ({
        serviceId: s.serviceId,
        name: s.service.name,
        price: Number(s.price),
        duration: s.duration,
      })),
      createdAt: a.createdAt,
    }));

    return ok({ items, total, page, limit });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues });
    }

    const { clientId, specialistId, locationId, startAt, services, notes, source } = parsed.data;
    const soldByUserId = req.headers.get('x-user-id') ?? undefined;

    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
    const endAt = new Date(startAt.getTime() + totalDuration * 60_000);

    const { randomUUID } = await import('crypto');

    const appointment = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        clientId,
        specialistId,
        locationId,
        startAt,
        endAt,
        status: 'CONFIRMED',
        totalPrice,
        totalDuration,
        notes,
        source,
        soldByUserId,
        services: {
          create: services.map((s, i) => ({
            id: randomUUID(),
            serviceId: s.serviceId,
            price: s.price,
            duration: s.duration,
            sortOrder: s.sortOrder ?? i,
          })),
        },
      },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
        services: { include: { service: { select: { name: true } } } },
        location: { select: { name: true } },
      },
    });

    return ok({
      id: appointment.id,
      clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
      specialistName: `${appointment.specialist.user.firstName} ${appointment.specialist.user.lastName}`,
      locationName: appointment.location.name,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      totalPrice: Number(appointment.totalPrice),
      totalDuration: appointment.totalDuration,
    }, 201);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
