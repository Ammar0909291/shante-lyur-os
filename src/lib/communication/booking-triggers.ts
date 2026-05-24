import { prisma } from '@/infrastructure/config/prisma-client';
import { omnichannelQueue } from '@/infrastructure/queues/queue-registry';
import type { OmnichannelMessageJob } from '@/infrastructure/queues/job-types';
type OmnichannelChannel = 'whatsapp' | 'telegram' | 'max' | 'email';

interface BookingTriggerParams {
  appointmentId: string;
  clientUserId: string;
  specialistUserId?: string;
  clientName: string;
  specialistName: string;
  serviceName: string;
  date: string;
  time: string;
}

async function getUserChannels(userId: string): Promise<OmnichannelChannel[]> {
  try {
    const pref = await (prisma as unknown as { communicationPreference: { findUnique: (args: unknown) => Promise<{ emailEnabled: boolean; whatsappEnabled: boolean; whatsappPhone: string | null; telegramEnabled: boolean; telegramChatId: string | null; maxEnabled: boolean; maxUserId: string | null } | null> } }).communicationPreference.findUnique({ where: { userId } });
    if (!pref) return [];
    const channels: OmnichannelChannel[] = [];
    if (pref.emailEnabled) channels.push('email');
    if (pref.whatsappEnabled && pref.whatsappPhone) channels.push('whatsapp');
    if (pref.telegramEnabled && pref.telegramChatId) channels.push('telegram');
    if (pref.maxEnabled && pref.maxUserId) channels.push('max');
    return channels;
  } catch {
    return [];
  }
}

async function enqueue(job: OmnichannelMessageJob): Promise<void> {
  try {
    await omnichannelQueue.add(`msg-${job.channel}-${job.userId}-${Date.now()}`, job);
  } catch (err) {
    // Queue unavailable (Redis not running) — log and continue
    console.warn('[BookingTriggers] Queue unavailable, skipping enqueue:', err instanceof Error ? err.message : err);
  }
}

export async function triggerBookingConfirmation(params: BookingTriggerParams): Promise<void> {
  const { appointmentId, clientUserId, specialistUserId, clientName, specialistName, serviceName, date, time } = params;

  const channels = await getUserChannels(clientUserId);
  const vars = { clientName, specialistName, serviceName, date, time, salonName: process.env['SALON_NAME'] ?? 'Shante Lyur' };

  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey: 'booking_confirmation', vars, appointmentId });
  }

  // Staff alert to specialist
  if (specialistUserId) {
    const staffChannels = await getUserChannels(specialistUserId);
    const staffVars = { ...vars, clientName, specialistName };
    for (const channel of staffChannels) {
      const msgId = await createPendingRecord(specialistUserId, channel, appointmentId);
      await enqueue({ outboundMessageId: msgId, userId: specialistUserId, channel, templateKey: 'staff_new_booking', vars: staffVars, appointmentId });
    }
  }

  console.info(`[BookingTriggers] booking_confirmation enqueued for ${clientUserId} via ${channels.join(',')}`);
}

export async function triggerBookingCancellation(params: BookingTriggerParams & { specialistUserId?: string }): Promise<void> {
  const { appointmentId, clientUserId, specialistUserId, clientName, specialistName, serviceName, date, time } = params;
  const vars = { clientName, specialistName, serviceName, date, time };

  const channels = await getUserChannels(clientUserId);
  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey: 'booking_cancellation', vars, appointmentId });
  }

  if (specialistUserId) {
    const staffChannels = await getUserChannels(specialistUserId);
    for (const channel of staffChannels) {
      const msgId = await createPendingRecord(specialistUserId, channel, appointmentId);
      await enqueue({ outboundMessageId: msgId, userId: specialistUserId, channel, templateKey: 'staff_cancellation', vars, appointmentId });
    }
  }
}

export async function triggerBookingReminder(params: BookingTriggerParams & { window: '24h' | '2h' }): Promise<void> {
  const { appointmentId, clientUserId, clientName, specialistName, serviceName, date, time, window } = params;
  const vars = { clientName, specialistName, serviceName, date, time };
  const templateKey = window === '2h' ? 'booking_reminder_2h' : 'booking_reminder_24h';

  const channels = await getUserChannels(clientUserId);
  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey, vars, appointmentId });
  }
}

export async function triggerBookingRescheduled(params: BookingTriggerParams): Promise<void> {
  const { appointmentId, clientUserId, clientName, specialistName, serviceName, date, time } = params;
  const vars = { clientName, specialistName, serviceName, date, time };

  const channels = await getUserChannels(clientUserId);
  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey: 'booking_rescheduled', vars, appointmentId });
  }
}

export async function triggerOperationalAlert(params: {
  adminUserIds: string[];
  templateKey: string;
  vars: Record<string, string>;
}): Promise<void> {
  const { adminUserIds, templateKey, vars } = params;

  for (const userId of adminUserIds) {
    const channels = await getUserChannels(userId);
    for (const channel of channels) {
      const msgId = await createPendingRecord(userId, channel, undefined);
      await enqueue({ outboundMessageId: msgId, userId, channel, templateKey, vars });
    }
  }
}

async function createPendingRecord(
  userId: string,
  channel: OmnichannelChannel,
  appointmentId?: string,
): Promise<string> {
  const record = await (prisma as unknown as { outboundMessage: { create: (args: unknown) => Promise<{ id: string }> } }).outboundMessage.create(
    { data: { userId, channel: channel.toUpperCase(), provider: channel, body: '', status: 'PENDING', appointmentId: appointmentId ?? null } },
  );
  return record.id;
}
