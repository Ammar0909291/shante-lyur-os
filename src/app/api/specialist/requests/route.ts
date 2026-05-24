export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

const LeaveSchema = z.object({
  type: z.literal('leave'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().max(500).optional(),
});

const ScheduleSchema = z.object({
  type: z.literal('schedule'),
  description: z.string().min(5).max(1000),
});

const ServiceSchema = z.object({
  type: z.literal('service'),
  serviceId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

const RequestSchema = z.discriminatedUnion('type', [LeaveSchema, ScheduleSchema, ServiceSchema]);

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  const [leaveReqs, scheduleReqs, capabilityReqs] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { specialistId: specialist.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, date: true, reason: true, status: true, reviewNotes: true, createdAt: true },
    }),
    prisma.scheduleChangeRequest.findMany({
      where: { specialistId: specialist.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, description: true, status: true, reviewNotes: true, createdAt: true },
    }),
    prisma.capabilityRequest.findMany({
      where: { specialistId: specialist.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, serviceId: true, note: true, status: true, reviewNotes: true, createdAt: true, service: { select: { name: true } } },
    }),
  ]);

  return ok({
    leave:    leaveReqs.map((r) => ({ ...r, type: 'leave' as const, date: (r.date as Date).toISOString().split('T')[0] })),
    schedule: scheduleReqs.map((r) => ({ ...r, type: 'schedule' as const })),
    service:  capabilityReqs.map((r) => ({ ...r, type: 'service' as const, serviceName: r.service.name })),
  });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  let body: unknown;
  try { body = await req.json(); } catch { return err('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  const data = parsed.data;

  if (data.type === 'leave') {
    const record = await prisma.leaveRequest.create({
      data: { specialistId: specialist.id, date: new Date(data.date), reason: data.reason },
    });
    return ok({ id: record.id, type: 'leave' }, 201);
  }

  if (data.type === 'schedule') {
    const record = await prisma.scheduleChangeRequest.create({
      data: { specialistId: specialist.id, description: data.description },
    });
    return ok({ id: record.id, type: 'schedule' }, 201);
  }

  // service capability request
  const service = await prisma.service.findUnique({ where: { id: data.serviceId }, select: { id: true } });
  if (!service) return err('NOT_FOUND', 'Service not found', 404);

  const record = await prisma.capabilityRequest.create({
    data: { specialistId: specialist.id, serviceId: data.serviceId, note: data.note },
  });
  return ok({ id: record.id, type: 'service' }, 201);
}
