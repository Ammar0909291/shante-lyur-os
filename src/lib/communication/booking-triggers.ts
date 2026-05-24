import { prisma } from '@/infrastructure/config/prisma-client';
import { omnichannelQueue } from '@/infrastructure/queues/queue-registry';
import type { OmnichannelMessageJob } from '@/infrastructure/queues/job-types';
type OmnichannelChannel = 'whatsapp' | 'telegram' | 'max' | 'email';

// BullMQ priority: 1 = highest. VIP jobs jump the queue.
const PRIORITY_VIP = 1;

export interface BookingTriggerParams {
  appointmentId: string;
  clientUserId: string;
  specialistUserId?: string;
  clientName: string;
  specialistName: string;
  serviceName: string;  // all booked services joined with ", "
  department?: string;  // specialist department (MASSAGE | COSMETOLOGY | ...)
  date: string;
  time: string;
  room?: string;        // assigned room/cabinet name
}

const SALON_NAME = process.env['SALON_NAME'] ?? 'Shante Lyur';

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

async function enqueue(job: OmnichannelMessageJob, priority?: number): Promise<void> {
  try {
    await omnichannelQueue.add(
      `msg-${job.channel}-${job.userId}-${Date.now()}`,
      job,
      priority !== undefined ? { priority } : undefined,
    );
  } catch (err) {
    console.warn('[BookingTriggers] Queue unavailable, skipping enqueue:', err instanceof Error ? err.message : err);
  }
}

function baseVars(p: BookingTriggerParams): Record<string, string> {
  return {
    clientName:     p.clientName,
    specialistName: p.specialistName,
    serviceName:    p.serviceName,
    date:           p.date,
    time:           p.time,
    salonName:      SALON_NAME,
    ...(p.room       ? { room: p.room }             : {}),
    ...(p.department ? { department: p.department } : {}),
  };
}

export async function triggerBookingConfirmation(params: BookingTriggerParams & { isVip?: boolean }): Promise<void> {
  const { appointmentId, clientUserId, specialistUserId, isVip } = params;
  const priority = isVip ? PRIORITY_VIP : undefined;
  const vars = baseVars(params);

  const channels = await getUserChannels(clientUserId);
  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey: 'booking_confirmation', vars, appointmentId }, priority);
  }

  // Staff alert — use VIP template if client is VIP, alert specialist directly
  if (specialistUserId) {
    const staffChannels = await getUserChannels(specialistUserId);
    const staffTemplate = isVip ? 'vip_booking' : 'staff_new_booking';
    for (const channel of staffChannels) {
      const msgId = await createPendingRecord(specialistUserId, channel, appointmentId);
      await enqueue({ outboundMessageId: msgId, userId: specialistUserId, channel, templateKey: staffTemplate, vars, appointmentId }, priority);
    }
  }

  console.info(`[BookingTriggers] booking_confirmation enqueued for ${clientUserId} via ${channels.join(',') || 'no channels'}${isVip ? ' [VIP priority]' : ''}`);
}

export async function triggerBookingCancellation(params: BookingTriggerParams): Promise<void> {
  const { appointmentId, clientUserId, specialistUserId } = params;
  const vars = baseVars(params);

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

  console.info(`[BookingTriggers] booking_cancellation enqueued for ${clientUserId} via ${channels.join(',') || 'no channels'}`);
}

export async function triggerBookingReminder(params: BookingTriggerParams & { window: '24h' | '2h' }): Promise<void> {
  const { appointmentId, clientUserId, window } = params;
  const vars = baseVars(params);
  const templateKey = window === '2h' ? 'booking_reminder_2h' : 'booking_reminder_24h';

  const channels = await getUserChannels(clientUserId);
  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey, vars, appointmentId });
  }

  console.info(`[BookingTriggers] ${templateKey} enqueued for ${clientUserId}`);
}

export async function triggerBookingRescheduled(params: BookingTriggerParams): Promise<void> {
  const { appointmentId, clientUserId } = params;
  const vars = baseVars(params);

  const channels = await getUserChannels(clientUserId);
  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey: 'booking_rescheduled', vars, appointmentId });
  }

  console.info(`[BookingTriggers] booking_rescheduled enqueued for ${clientUserId}`);
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

export async function triggerNoShow(params: BookingTriggerParams & { adminUserIds?: string[] }): Promise<void> {
  const { appointmentId, specialistUserId, adminUserIds = [] } = params;
  const vars = baseVars(params);

  // Alert specialist
  if (specialistUserId) {
    const channels = await getUserChannels(specialistUserId);
    for (const channel of channels) {
      const msgId = await createPendingRecord(specialistUserId, channel, appointmentId);
      await enqueue({ outboundMessageId: msgId, userId: specialistUserId, channel, templateKey: 'no_show', vars, appointmentId });
    }
  }

  // Alert admins
  for (const userId of adminUserIds) {
    const channels = await getUserChannels(userId);
    for (const channel of channels) {
      const msgId = await createPendingRecord(userId, channel, appointmentId);
      await enqueue({ outboundMessageId: msgId, userId, channel, templateKey: 'no_show', vars, appointmentId });
    }
  }
}

export async function triggerPaymentReceived(params: {
  appointmentId: string;
  clientUserId: string;
  clientName: string;
  serviceName: string;
  amount: string;
  currency?: string;
  date: string;
}): Promise<void> {
  const { appointmentId, clientUserId, clientName, serviceName, amount, currency = 'руб.', date } = params;
  const vars = { clientName, serviceName, amount, currency, date, salonName: SALON_NAME };

  const channels = await getUserChannels(clientUserId);
  for (const channel of channels) {
    const msgId = await createPendingRecord(clientUserId, channel, appointmentId);
    await enqueue({ outboundMessageId: msgId, userId: clientUserId, channel, templateKey: 'payment_received', vars, appointmentId });
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
