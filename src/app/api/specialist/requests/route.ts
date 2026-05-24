export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

const PostSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('leave'), date: z.string(), reason: z.string().max(500).optional() }),
  z.object({ type: z.literal('schedule'), description: z.string().min(1).max(1000) }),
  z.object({ type: z.literal('service'), serviceId: z.string().uuid(), note: z.string().max(500).optional() }),
]);

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  const [leave, schedule, capability] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { specialistId: specialist.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.scheduleChangeRequest.findMany({
      where: { specialistId: specialist.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.capabilityRequest.findMany({
      where: { specialistId: specialist.id },
      include: { service: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return ok({
    leave,
    schedule,
    service: capability.map((c) => ({ ...c, serviceName: c.service.name })),
  });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const specialist = await prisma.specialist.findUnique({
    where: { userId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  let body: unknown;
  try { body = await req.json(); } catch { return err('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid', 400);

  const data = parsed.data;
  let createdId: string;
  let typeLabel = '';

  if (data.type === 'leave') {
    const r = await prisma.leaveRequest.create({
      data: { id: crypto.randomUUID(), specialistId: specialist.id, date: new Date(data.date), reason: data.reason ?? null },
    });
    createdId = r.id;
    typeLabel = 'отгул';
  } else if (data.type === 'schedule') {
    const r = await prisma.scheduleChangeRequest.create({
      data: { id: crypto.randomUUID(), specialistId: specialist.id, description: data.description },
    });
    createdId = r.id;
    typeLabel = 'изменение расписания';
  } else {
    const r = await prisma.capabilityRequest.create({
      data: { id: crypto.randomUUID(), specialistId: specialist.id, serviceId: data.serviceId, note: data.note ?? null },
    });
    createdId = r.id;
    typeLabel = 'добавление услуги';
  }

  // Notify all active managers/admins
  const specialistName = `${specialist.user.firstName} ${specialist.user.lastName}`;
  const managers = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (managers.length > 0) {
    await prisma.notification.createMany({
      data: managers.map((m) => ({
        id: crypto.randomUUID(),
        userId: m.id,
        type: 'STAFF_ALERT' as const,
        channel: 'IN_APP' as const,
        status: 'SENT' as const,
        title: 'Новый запрос сотрудника',
        body: `${specialistName} подал запрос: ${typeLabel}`,
        sentAt: new Date(),
      })),
    });
  }

  return ok({ id: createdId }, 201);
}
