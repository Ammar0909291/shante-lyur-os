export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];
const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const CreateSchema = z.object({
  specialistId: z.string().uuid(),
  locationId: z.string().uuid(),
  dayOfWeek: z.enum([
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
  ]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  validFrom: z.string(),
  validUntil: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  const { searchParams } = new URL(req.url);
  const specialistId = searchParams.get('specialistId');
  if (!specialistId) return R.badRequest('specialistId is required');

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [schedules, blockedTimes, vacations, locations] = await Promise.all([
    prisma.workingSchedule.findMany({
      where: { specialistId },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.blockedTime.findMany({
      where: { specialistId, startAt: { gte: now } },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { startAt: 'asc' },
      take: 20,
    }),
    prisma.vacation.findMany({
      where: { specialistId, startDate: { gte: thirtyDaysAgo } },
      orderBy: { startDate: 'asc' },
    }),
    prisma.location.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return R.success({ schedules, blockedTimes, vacations, locations });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!MANAGE_ROLES.includes(role)) return R.forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const d = parsed.data;

  const existing = await prisma.workingSchedule.findFirst({
    where: { specialistId: d.specialistId, locationId: d.locationId, dayOfWeek: d.dayOfWeek },
  });

  const data = {
    startTime: d.startTime,
    endTime: d.endTime,
    breakStart: d.breakStart ?? null,
    breakEnd: d.breakEnd ?? null,
    validFrom: new Date(d.validFrom),
    validUntil: d.validUntil ? new Date(d.validUntil) : null,
    isActive: true,
  };

  let schedule;
  if (existing) {
    schedule = await prisma.workingSchedule.update({ where: { id: existing.id }, data });
  } else {
    schedule = await prisma.workingSchedule.create({
      data: {
        specialistId: d.specialistId,
        locationId: d.locationId,
        dayOfWeek: d.dayOfWeek,
        ...data,
      },
    });
  }

  return R.success(schedule, existing ? 200 : 201);
}
