export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  clientCode: string;
}

interface SpecialistResult {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  status: string;
}

interface ServiceResult {
  id: string;
  name: string;
  displayCategory: string | null;
  baseDuration: number;
  basePrice: string;
}

interface AppointmentResult {
  id: string;
  clientName: string;
  specialistName: string;
  startAt: string;
  status: string;
  services: string[];
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const params = req.nextUrl.searchParams;
    const q = (params.get('q') ?? '').trim();
    const typesParam = params.get('types');

    if (q.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: 'QUERY_TOO_SHORT', message: 'Min 2 chars' } },
        { status: 400 },
      );
    }

    const allTypes = ['client', 'specialist', 'service', 'appointment'];
    const types = typesParam
      ? typesParam.split(',').map((t) => t.trim()).filter((t) => allTypes.includes(t))
      : allTypes;

    const MAX_PER_TYPE = 5;

    // ── Client search ──────────────────────────────────────────────────────────
    let clients: ClientResult[] = [];
    if (types.includes('client')) {
      const clientUsers = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
        take: MAX_PER_TYPE,
        orderBy: { firstName: 'asc' },
      });

      clients = clientUsers.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        email: u.email,
        clientCode: 'CL-' + u.id.replace(/-/g, '').substring(0, 8).toUpperCase(),
      }));
    }

    // ── Specialist search ──────────────────────────────────────────────────────
    let specialists: SpecialistResult[] = [];
    if (types.includes('specialist')) {
      const specialistRecords = await prisma.specialist.findMany({
        where: {
          OR: [
            { user: { firstName: { contains: q, mode: 'insensitive' } } },
            { user: { lastName: { contains: q, mode: 'insensitive' } } },
            { specialization: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          status: true,
          specialization: true,
          user: { select: { firstName: true, lastName: true } },
        },
        take: MAX_PER_TYPE,
        orderBy: { user: { firstName: 'asc' } },
      });

      specialists = specialistRecords.map((s) => ({
        id: s.id,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        specialization: s.specialization,
        status: s.status,
      }));
    }

    // ── Service search ─────────────────────────────────────────────────────────
    let services: ServiceResult[] = [];
    if (types.includes('service')) {
      const serviceRecords = await prisma.service.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { displayCategory: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          displayCategory: true,
          baseDuration: true,
          basePrice: true,
        },
        take: MAX_PER_TYPE,
        orderBy: { name: 'asc' },
      });

      services = serviceRecords.map((s) => ({
        id: s.id,
        name: s.name,
        displayCategory: s.displayCategory,
        baseDuration: s.baseDuration,
        basePrice: s.basePrice.toString(),
      }));
    }

    // ── Appointment search ─────────────────────────────────────────────────────
    let appointments: AppointmentResult[] = [];
    if (types.includes('appointment')) {
      // Find client IDs matching the name query first, then fetch appointments
      const matchingClients = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 20,
      });
      const matchingClientIds = matchingClients.map((c) => c.id);

      const appointmentRecords = await prisma.appointment.findMany({
        where: matchingClientIds.length > 0
          ? { clientId: { in: matchingClientIds } }
          : { id: 'no-match' }, // no results if no matching clients
        include: {
          client: { select: { firstName: true, lastName: true } },
          specialist: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          services: {
            select: {
              service: { select: { name: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { startAt: 'desc' },
        take: MAX_PER_TYPE,
      });

      appointments = appointmentRecords.map((a) => ({
        id: a.id,
        clientName: `${a.client.firstName} ${a.client.lastName}`,
        specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
        startAt: a.startAt.toISOString(),
        status: a.status,
        services: a.services.map((s) => s.service.name),
      }));
    }

    return ok({ clients, specialists, services, appointments });
  } catch (error) {
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
