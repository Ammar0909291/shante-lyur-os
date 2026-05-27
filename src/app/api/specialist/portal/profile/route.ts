export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

const PatchSchema = z.object({
  displayName:        z.string().max(100).optional(),
  phone:              z.string().max(30).nullable().optional(),
  languagePreference: z.enum(['ru', 'en']).optional(),
  services:           z.array(z.string().uuid()).optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const specialist = await prisma.specialist.findUnique({
    where: { userId },
    select: {
      id: true,
      specialization: true,
      department: true,
      user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
      services: {
        where: { isActive: true },
        select: { service: { select: { id: true, name: true, baseDuration: true } } },
      },
      workingSchedules: {
        where: { isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true, breakStart: true, breakEnd: true },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  return ok({
    ...specialist,
    rooms: [] as { id: string; name: string; type: string }[],
    services: specialist.services.map((s) => s.service),
  });
}

export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  let body: unknown;
  try { body = await req.json(); } catch { return err('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const { phone, services } = parsed.data;

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  if (phone !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { phone } });
  }

  if (services !== undefined) {
    // Deactivate all current specialist services
    await prisma.specialistService.updateMany({
      where: { specialistId: specialist.id },
      data: { isActive: false },
    });
    // Upsert each selected service as active
    for (const serviceId of services) {
      await prisma.specialistService.upsert({
        where: { specialistId_serviceId: { specialistId: specialist.id, serviceId } },
        update: { isActive: true },
        create: { specialistId: specialist.id, serviceId, isActive: true },
      });
    }
  }

  return ok({ updated: true });
}
