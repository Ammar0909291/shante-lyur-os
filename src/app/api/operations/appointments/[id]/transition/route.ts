export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  ok,
  checkAuth,
  apiError,
} from '@/app/api/analytics/dashboard/_utils';
import type { TransitionAction } from '@/types/operations';

// ─── Valid transition map ─────────────────────────────────────────────────────

// Maps: current DB status → allowed actions
const ALLOWED: Record<string, TransitionAction[]> = {
  PENDING:     ['confirm', 'checkin', 'start', 'noshow', 'cancel'],
  CONFIRMED:   ['checkin', 'start', 'noshow', 'cancel'],
  IN_PROGRESS: ['complete', 'cancel'],
  // Terminal states — no transitions
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
  RESCHEDULED: [],
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id } = await params;

  let body: { action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { action } = body;
  if (!action) return apiError('BAD_REQUEST', 'action is required', 400);

  console.log('[ops/transition]', { id, action, userId });

  try {
    const apt = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, checkedInAt: true },
    });

    if (!apt) return apiError('NOT_FOUND', 'Appointment not found', 404);

    const currentStatus = apt.status as string;
    const allowed = ALLOWED[currentStatus] ?? [];

    if (!allowed.includes(action as TransitionAction)) {
      return apiError(
        'INVALID_TRANSITION',
        `Cannot perform '${action}' from status '${currentStatus}'`,
        400,
      );
    }

    const now = new Date();
    let updateData: Record<string, unknown> = {};

    switch (action as TransitionAction) {
      case 'confirm':
        updateData = { status: 'CONFIRMED' };
        break;

      case 'checkin':
        // Sets checkedInAt; status stays (operational view shows ARRIVED)
        if (!apt.checkedInAt) {
          updateData = { checkedInAt: now };
        }
        break;

      case 'start':
        updateData = {
          status: 'IN_PROGRESS',
          checkedInAt: apt.checkedInAt ?? now, // record arrival if not yet checked in
        };
        break;

      case 'complete':
        updateData = {
          status: 'COMPLETED',
          checkedOutAt: now,
        };
        break;

      case 'noshow':
        updateData = {
          status: 'NO_SHOW',
          noShowAt: now,
        };
        break;

      case 'cancel':
        updateData = {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledBy: userId ?? undefined,
        };
        break;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, checkedInAt: true, checkedOutAt: true },
    });

    console.log('[ops/transition] done', { id, from: currentStatus, action, to: updated.status });

    return ok({ id: updated.id, status: updated.status, action });
  } catch (err) {
    console.error('[ops/transition] error', err);
    return apiError('INTERNAL_ERROR', 'Failed to update appointment', 500);
  }
}
