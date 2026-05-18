export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ManageNotificationPreferencesUseCase } from '@/application/use-cases/notifications/manage-notification-preferences.use-case';
import { DomainError } from '@/domain/errors';
import { z } from 'zod';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const UpdatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  telegramChatId: z.string().max(50).optional(),
  appointmentReminders: z.boolean().optional(),
  followUpMessages: z.boolean().optional(),
  loyaltyUpdates: z.boolean().optional(),
  membershipReminders: z.boolean().optional(),
  marketingMessages: z.boolean().optional(),
  reminderLeadHours: z.number().int().min(1).max(168).optional(),
});

function prefToJson(pref: any) {
  return {
    userId: pref.userId,
    emailEnabled: pref.emailEnabled,
    smsEnabled: pref.smsEnabled,
    pushEnabled: pref.pushEnabled,
    telegramEnabled: pref.telegramEnabled,
    telegramChatId: pref.telegramChatId,
    appointmentReminders: pref.appointmentReminders,
    followUpMessages: pref.followUpMessages,
    loyaltyUpdates: pref.loyaltyUpdates,
    membershipReminders: pref.membershipReminders,
    marketingMessages: pref.marketingMessages,
    reminderLeadHours: pref.reminderLeadHours,
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const registry = DIRegistry.instance;
    const uc = new ManageNotificationPreferencesUseCase(registry.notificationPreferenceRepository);
    const pref = await uc.get(userId);
    return ok(prefToJson(pref));
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, 400);
    console.error('[GET /api/notifications/preferences]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body = await req.json();
    const parsed = UpdatePreferencesSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.message, 400);

    const registry = DIRegistry.instance;
    const uc = new ManageNotificationPreferencesUseCase(registry.notificationPreferenceRepository);
    const pref = await uc.update(userId, parsed.data);
    return ok(prefToJson(pref));
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, 400);
    console.error('[PUT /api/notifications/preferences]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
