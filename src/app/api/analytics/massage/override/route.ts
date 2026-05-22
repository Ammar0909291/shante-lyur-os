export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { apiError, ok } from '@/app/api/analytics/dashboard/_utils';
import type { WorkloadOverrideRecord } from '@/types/analytics';

// Only ADMIN and SUPER_ADMIN may create/delete overrides (not OPERATOR)
const OVERRIDE_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

function checkAdminAuth(userId: string | null, role: string): Response | null {
  if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (!(OVERRIDE_ROLES as readonly string[]).includes(role)) {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }
  return null;
}

function toOverrideRecord(ov: {
  id: string;
  specialistId: string;
  date: Date;
  reason: string | null;
  overriddenBy: string;
  createdAt: Date;
}): WorkloadOverrideRecord {
  return {
    id: ov.id,
    specialistId: ov.specialistId,
    date: ov.date.toISOString().slice(0, 10), // YYYY-MM-DD
    reason: ov.reason,
    overriddenBy: ov.overriddenBy,
    createdAt: ov.createdAt.toISOString(),
  };
}

// ─── POST /api/analytics/massage/override ────────────────────────────────────

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAdminAuth(userId, role);
  if (authErr) return authErr;

  let body: { specialistId?: string; date?: string; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { specialistId, date, reason } = body;

  if (!specialistId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return apiError('BAD_REQUEST', 'specialistId and date (YYYY-MM-DD) are required', 400);
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    // 409 — idempotent: return existing if already overridden
    const existing = await prisma.workloadOverride.findUnique({
      where: { specialistId_date: { specialistId, date: dateObj } },
    });

    if (existing) {
      return Response.json(
        { success: true, override: toOverrideRecord(existing) },
        { status: 409 },
      );
    }

    const override = await prisma.workloadOverride.create({
      data: {
        specialistId,
        date: dateObj,
        reason: reason ?? null,
        overriddenBy: userId!,
      },
    });

    return Response.json({ success: true, override: toOverrideRecord(override) }, { status: 201 });
  } catch (err) {
    console.error('[analytics/massage/override POST] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to create override', 500);
  }
}

// ─── DELETE /api/analytics/massage/override ───────────────────────────────────

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAdminAuth(userId, role);
  if (authErr) return authErr;

  let body: { specialistId?: string; date?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { specialistId, date } = body;

  if (!specialistId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return apiError('BAD_REQUEST', 'specialistId and date (YYYY-MM-DD) are required', 400);
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    const existing = await prisma.workloadOverride.findUnique({
      where: { specialistId_date: { specialistId, date: dateObj } },
    });

    if (!existing) {
      return apiError('NOT_FOUND', 'Override not found', 404);
    }

    await prisma.workloadOverride.delete({
      where: { specialistId_date: { specialistId, date: dateObj } },
    });

    return ok({ deleted: true, specialistId, date });
  } catch (err) {
    console.error('[analytics/massage/override DELETE] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to delete override', 500);
  }
}
