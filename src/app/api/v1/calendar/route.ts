export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const QuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .default(() => new Date().toISOString().slice(0, 10)),
  view: z.enum(['day', 'week']).default('day'),
});

const CALENDAR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'SPECIALIST', 'COSMETOLOGIST', 'MASSAGIST'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!CALENDAR_ROLES.includes(role)) return R.forbidden();

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) return R.badRequest('Invalid query parameters', parsed.error.issues);

  const { date, view } = parsed.data;

  // Build date range
  const from = new Date(`${date}T00:00:00`);
  const to   = new Date(from);
  if (view === 'week') {
    to.setDate(to.getDate() + 6);
  }
  to.setHours(23, 59, 59, 999);

  const [appointments, specialists] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startAt: { gte: from, lte: to },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        client:    { select: { id: true, firstName: true, lastName: true, phone: true } },
        specialist: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        services: {
          include: { service: { select: { id: true, name: true, category: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { startAt: 'asc' },
    }),
    prisma.specialist.findMany({
      where: { user: { status: 'ACTIVE' } },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { user: { firstName: 'asc' } },
    }),
  ]);

  const data = {
    date,
    view,
    from: from.toISOString(),
    to:   to.toISOString(),
    specialists: specialists.map((s) => ({
      id:        s.id,
      userId:    s.user.id,
      name:      `${s.user.firstName} ${s.user.lastName}`.trim(),
      avatarUrl: s.user.avatarUrl ?? null,
    })),
    appointments: appointments.map((a) => ({
      id:             a.id,
      startAt:        a.startAt.toISOString(),
      endAt:          a.endAt.toISOString(),
      totalDuration:  a.totalDuration,
      status:         a.status,
      notes:          a.notes ?? null,
      source:         a.source ?? null,
      specialistId:   a.specialistId,
      specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`.trim(),
      specialistAvatar: a.specialist.user.avatarUrl ?? null,
      clientId:       a.clientId,
      clientName:     `${a.client.firstName} ${a.client.lastName}`.trim(),
      clientPhone:    a.client.phone ?? null,
      services:       a.services.map((s) => ({
        serviceId: s.serviceId,
        name:      s.service.name,
        category:  s.service.category,
        duration:  s.duration,
        price:     s.price.toNumber(),
      })),
      totalPrice: a.totalPrice.toNumber(),
    })),
  };

  return R.success(data);
}
