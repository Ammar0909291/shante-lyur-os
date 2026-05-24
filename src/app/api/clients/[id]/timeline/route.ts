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

interface TimelineEntry {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  totalPrice: number;
  paidAmount: number;
  specialist: { id: string; name: string } | null;
  services: Array<{ id: string; name: string; duration: number; price: number }>;
  room: { name: string } | null;
  source: string | null;
  notes: string | null;
}

interface FavoriteItem {
  id: string;
  name: string;
  count: number;
}

interface TimelineStats {
  totalVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  noShowVisits: number;
  totalSpent: number;
  avgSpendPerVisit: number;
  favoriteService: FavoriteItem | null;
  favoriteSpecialist: FavoriteItem | null;
  lastVisitDaysAgo: number | null;
  inactiveAlert: boolean;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Auth check
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const clientId = params.id;

    const searchParams = req.nextUrl.searchParams;
    const limitRaw = parseInt(searchParams.get('limit') ?? '50', 10);
    const offsetRaw = parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Math.min(100, Math.max(1, isNaN(limitRaw) ? 50 : limitRaw));
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

    // Verify the client exists
    const client = await prisma.user.findFirst({
      where: { id: clientId, role: 'CLIENT' },
      select: { id: true },
    });
    if (!client) {
      return apiError('NOT_FOUND', 'Client not found', 404);
    }

    // ── Fetch ALL appointments for stats computation ────────────────────────────
    const allAppointments = await prisma.appointment.findMany({
      where: { clientId },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        totalPrice: true,
        paidAmount: true,
        notes: true,
        source: true,
        specialistId: true,
        specialist: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        room: { select: { name: true } },
        services: {
          select: {
            serviceId: true,
            price: true,
            duration: true,
            service: { select: { id: true, name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    const total = allAppointments.length;

    // ── Paginate for timeline ──────────────────────────────────────────────────
    const pagedAppointments = allAppointments.slice(offset, offset + limit);

    const timeline: TimelineEntry[] = pagedAppointments.map((appt) => ({
      id: appt.id,
      startAt: appt.startAt.toISOString(),
      endAt: appt.endAt.toISOString(),
      status: appt.status,
      totalPrice: Number(appt.totalPrice),
      paidAmount: Number(appt.paidAmount),
      specialist: appt.specialist
        ? {
            id: appt.specialist.id,
            name: `${appt.specialist.user.firstName} ${appt.specialist.user.lastName}`,
          }
        : null,
      services: appt.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        duration: s.duration,
        price: Number(s.price),
      })),
      room: appt.room ? { name: appt.room.name } : null,
      source: appt.source,
      notes: appt.notes,
    }));

    // ── Compute stats from ALL appointments ────────────────────────────────────
    let completedVisits = 0;
    let cancelledVisits = 0;
    let noShowVisits = 0;
    let totalSpent = 0;

    // For favorite service: count occurrences of each serviceId
    const serviceCountMap = new Map<string, { name: string; count: number }>();
    // For favorite specialist: count COMPLETED appointments per specialistId
    const specialistCountMap = new Map<string, { name: string; count: number }>();

    let lastCompletedAt: Date | null = null;

    for (const appt of allAppointments) {
      if (appt.status === 'COMPLETED') {
        completedVisits++;
        totalSpent += Number(appt.paidAmount);

        // Track last completed appointment (appointments are DESC ordered, so first COMPLETED wins)
        if (!lastCompletedAt) {
          lastCompletedAt = new Date(appt.startAt);
        }

        // Favorite specialist tracking (completed only)
        if (appt.specialist) {
          const specId = appt.specialist.id;
          const specName = `${appt.specialist.user.firstName} ${appt.specialist.user.lastName}`;
          const existing = specialistCountMap.get(specId);
          if (existing) {
            existing.count++;
          } else {
            specialistCountMap.set(specId, { name: specName, count: 1 });
          }
        }
      } else if (appt.status === 'CANCELLED') {
        cancelledVisits++;
      } else if (appt.status === 'NO_SHOW') {
        noShowVisits++;
      }

      // Favorite service tracking (all statuses, aggregate service appearances)
      for (const svc of appt.services) {
        const svcId = svc.service.id;
        const svcName = svc.service.name;
        const existing = serviceCountMap.get(svcId);
        if (existing) {
          existing.count++;
        } else {
          serviceCountMap.set(svcId, { name: svcName, count: 1 });
        }
      }
    }

    // Determine favorite service
    let favoriteService: FavoriteItem | null = null;
    let maxServiceCount = 0;
    for (const [svcId, { name, count }] of serviceCountMap) {
      if (count > maxServiceCount) {
        maxServiceCount = count;
        favoriteService = { id: svcId, name, count };
      }
    }

    // Determine favorite specialist
    let favoriteSpecialist: FavoriteItem | null = null;
    let maxSpecCount = 0;
    for (const [specId, { name, count }] of specialistCountMap) {
      if (count > maxSpecCount) {
        maxSpecCount = count;
        favoriteSpecialist = { id: specId, name, count };
      }
    }

    // Days since last visit
    let lastVisitDaysAgo: number | null = null;
    if (lastCompletedAt) {
      const now = new Date();
      const diffMs = now.getTime() - lastCompletedAt.getTime();
      lastVisitDaysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const avgSpendPerVisit =
      completedVisits > 0 ? Math.round((totalSpent / completedVisits) * 100) / 100 : 0;

    const stats: TimelineStats = {
      totalVisits: total,
      completedVisits,
      cancelledVisits,
      noShowVisits,
      totalSpent: Math.round(totalSpent * 100) / 100,
      avgSpendPerVisit,
      favoriteService,
      favoriteSpecialist,
      lastVisitDaysAgo,
      inactiveAlert: lastVisitDaysAgo !== null && lastVisitDaysAgo > 60,
    };

    return ok({
      timeline,
      stats,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
