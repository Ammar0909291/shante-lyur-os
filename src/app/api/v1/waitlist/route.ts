export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];

const CreateSchema = z.object({
  clientId:      z.string().uuid(),
  serviceId:     z.string().uuid(),
  specialistId:  z.string().uuid().optional(),
  locationId:    z.string().uuid().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferredTo:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes:         z.string().max(2000).optional(),
  expiresAt:     z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  const { searchParams } = new URL(req.url);
  const status      = searchParams.get('status') ?? '';
  const serviceId   = searchParams.get('serviceId') ?? '';
  const specialistId = searchParams.get('specialistId') ?? '';
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const skip  = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status)       where.status      = status;
  if (serviceId)    where.serviceId   = serviceId;
  if (specialistId) where.specialistId = specialistId;

  const [items, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      select: {
        id:            true,
        status:        true,
        preferredDate: true,
        preferredFrom: true,
        preferredTo:   true,
        notes:         true,
        notifiedAt:    true,
        expiresAt:     true,
        createdAt:     true,
        client: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            phone:     true,
            email:     true,
          },
        },
        service:    { select: { id: true, name: true } },
        specialist: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        location:   { select: { id: true, name: true } },
      },
    }),
    prisma.waitlistEntry.count({ where }),
  ]);

  return R.success({
    items: items.map((e) => ({
      ...e,
      preferredDate: e.preferredDate ? (e.preferredDate as Date).toISOString().split('T')[0] : null,
      preferredFrom: e.preferredFrom ? formatTime(e.preferredFrom as Date) : null,
      preferredTo:   e.preferredTo   ? formatTime(e.preferredTo   as Date) : null,
      notifiedAt:    e.notifiedAt?.toISOString() ?? null,
      expiresAt:     e.expiresAt?.toISOString()  ?? null,
      createdAt:     e.createdAt.toISOString(),
      specialistName: e.specialist
        ? `${e.specialist.user.firstName} ${e.specialist.user.lastName}`.trim()
        : null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  let body: unknown;
  try { body = await req.json(); } catch { return R.badRequest('Invalid JSON body'); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const d = parsed.data;

  const entry = await prisma.waitlistEntry.create({
    data: {
      clientId:      d.clientId,
      serviceId:     d.serviceId,
      specialistId:  d.specialistId,
      locationId:    d.locationId,
      preferredDate: d.preferredDate ? new Date(d.preferredDate) : undefined,
      preferredFrom: d.preferredFrom ? parseTime(d.preferredFrom) : undefined,
      preferredTo:   d.preferredTo   ? parseTime(d.preferredTo)   : undefined,
      notes:         d.notes,
      expiresAt:     d.expiresAt ? new Date(d.expiresAt) : undefined,
    },
    select: { id: true, status: true, createdAt: true },
  });

  return R.success({ id: entry.id, status: entry.status, createdAt: entry.createdAt.toISOString() }, 201);
}

function parseTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(0);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function formatTime(d: Date): string {
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
