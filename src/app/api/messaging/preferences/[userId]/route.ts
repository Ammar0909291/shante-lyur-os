export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { prisma } from '@/infrastructure/config/prisma-client';

interface RouteCtx { params: { userId: string } }

export async function GET(request: NextRequest, { params }: RouteCtx) {
  const requestingUserId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!requestingUserId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role ?? '');
  if (!isAdmin && requestingUserId !== params.userId) {
    return apiError('FORBIDDEN', 'Access denied', 403);
  }

  try {
    const pref = await prisma.communicationPreference.findUnique({
      where: { userId: params.userId },
    });

    if (!pref) {
      return ok({
        userId: params.userId,
        whatsappEnabled: false, telegramEnabled: false, maxEnabled: false,
        emailEnabled: true, inAppEnabled: true,
        whatsappPhone: null, telegramChatId: null, maxUserId: null,
        allowPromotional: true, allowReminders: true, allowConfirmations: true, allowStaffAlerts: true,
      });
    }

    return ok(pref);
  } catch (err) {
    console.error('[API:messaging/preferences] GET', err);
    return apiError('INTERNAL_ERROR', 'Failed to load preferences', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteCtx) {
  const requestingUserId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!requestingUserId) return apiError('UNAUTHORIZED', 'Auth required', 401);

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role ?? '');
  if (!isAdmin && requestingUserId !== params.userId) {
    return apiError('FORBIDDEN', 'Access denied', 403);
  }

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  const allowedFields = [
    'whatsappEnabled', 'telegramEnabled', 'maxEnabled', 'emailEnabled', 'inAppEnabled',
    'whatsappPhone', 'telegramChatId', 'maxUserId',
    'allowPromotional', 'allowReminders', 'allowConfirmations', 'allowStaffAlerts',
  ];
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }

  try {
    const pref = await prisma.communicationPreference.upsert({
      where: { userId: params.userId },
      update: data,
      create: { userId: params.userId, ...data },
    });

    return ok(pref);
  } catch (err) {
    console.error('[API:messaging/preferences] PUT', err);
    return apiError('INTERNAL_ERROR', 'Failed to save preferences', 500);
  }
}
