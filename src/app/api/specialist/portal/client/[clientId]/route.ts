export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

interface RouteContext { params: Promise<{ clientId: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  const { clientId } = await context.params;

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('NOT_FOUND', 'Specialist record not found', 404);

  // Verify this specialist has had at least one appointment with the client (access guard)
  const hasRelation = await prisma.appointment.findFirst({
    where: { specialistId: specialist.id, clientId },
    select: { id: true },
  });
  if (!hasRelation) return err('FORBIDDEN', 'No appointment history with this client', 403);

  const [client, profile, recentAppointments, specialistNotes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: clientId },
      select: { firstName: true, lastName: true, phone: true, email: true },
    }),
    prisma.customerProfile.findUnique({
      where: { userId: clientId },
      include: {
        allergies: { select: { allergen: true, severity: true, reaction: true } },
        restrictions: { select: { type: true, description: true, isActive: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { specialistId: specialist.id, clientId, status: 'COMPLETED' },
      orderBy: { startAt: 'desc' },
      take: 10,
      include: {
        services: { include: { service: { select: { name: true } } } },
      },
    }),
    prisma.specialistNote.findMany({
      where: { specialistId: specialist.id, profile: { userId: clientId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, noteType: true, content: true, createdAt: true },
    }),
  ]);

  if (!client) return err('NOT_FOUND', 'Client not found', 404);

  return ok({
    id: clientId,
    name: `${client.firstName} ${client.lastName}`,
    phone: client.phone,
    allergies: profile?.allergies.map((a) => ({
      name: a.allergen,
      severity: a.severity,
      reaction: a.reaction,
    })) ?? [],
    restrictions: profile?.restrictions.map((r) => ({
      type: r.type,
      description: r.description,
      isActive: r.isActive,
    })) ?? [],
    skinType: profile?.skinType ?? null,
    bodyType: profile?.bodyType ?? null,
    notes: profile?.notes ?? null,
    recentVisits: recentAppointments.map((a) => ({
      id: a.id,
      date: a.startAt,
      services: a.services.map((s) => s.service.name),
      total: Number(a.totalPrice),
      appointmentNotes: a.notes,
    })),
    specialistNotes: specialistNotes.map((n) => ({
      id: n.id,
      type: n.noteType,
      content: n.content,
      date: n.createdAt,
    })),
  });
}
