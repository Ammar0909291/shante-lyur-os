import { prisma } from '@/infrastructure/config/prisma-client';
import { getChannelRouter } from './channel-router';
import { renderTemplate } from './templates/definitions';
import type { TemplateVariables, ProviderChannel, SendResult } from './types';

export interface SendMessageOptions {
  userId: string;
  channel: ProviderChannel;
  templateKey: string;
  vars: TemplateVariables;
  appointmentId?: string;
  scheduledAt?: Date;
  lang?: 'ru' | 'en';
}

export interface BroadcastOptions {
  userIds: string[];
  channel: ProviderChannel;
  templateKey: string;
  vars: TemplateVariables;
  appointmentId?: string;
}

export class MessagingService {
  private readonly router = getChannelRouter();

  async sendToUser(opts: SendMessageOptions): Promise<{ messageId: string; result: SendResult }> {
    const { userId, channel, templateKey, vars, appointmentId, lang = 'ru' } = opts;

    const body = renderTemplate(templateKey, vars, lang);
    if (!body) throw new Error(`Template not found: ${templateKey}`);

    // Resolve recipient contact from preferences
    const pref = await prisma.communicationPreference.findUnique({ where: { userId } });
    const recipient = this.resolveRecipient(channel, pref, vars);

    if (!recipient) {
      // Still log as failed so operators can see it
      const msg = await prisma.outboundMessage.create({
        data: {
          userId, channel: channel.toUpperCase() as never,
          provider: channel, body, templateData: vars as never,
          status: 'FAILED', errorMessage: 'No recipient contact configured',
          appointmentId: appointmentId ?? null,
        },
      });
      return { messageId: msg.id, result: { success: false, error: 'No recipient contact' } };
    }

    // Create pending log entry
    const logEntry = await prisma.outboundMessage.create({
      data: {
        userId, channel: channel.toUpperCase() as never,
        provider: channel, body, templateData: vars as never,
        status: 'QUEUED',
        recipientPhone: channel === 'whatsapp' ? recipient : null,
        recipientChatId: ['telegram', 'max'].includes(channel) ? recipient : null,
        recipientEmail: channel === 'email' ? recipient : null,
        appointmentId: appointmentId ?? null,
        scheduledAt: opts.scheduledAt ?? null,
      },
    });

    // Send immediately (in production use BullMQ queue for deferred/retry)
    const provider = this.router.getProvider(channel);
    if (!provider || !provider.isConfigured()) {
      await prisma.outboundMessage.update({
        where: { id: logEntry.id },
        data: { status: 'FAILED', errorMessage: `Provider ${channel} not configured`, failedAt: new Date() },
      });
      return { messageId: logEntry.id, result: { success: false, error: `Provider not configured: ${channel}` } };
    }

    const result = await provider.send({ to: recipient, body });

    await prisma.outboundMessage.update({
      where: { id: logEntry.id },
      data: result.success
        ? { status: 'SENT', sentAt: new Date(), externalId: result.externalId ?? null, providerResponse: result.providerResponse as never }
        : { status: 'FAILED', failedAt: new Date(), errorMessage: result.error, providerResponse: result.providerResponse as never },
    });

    console.info(`[MessagingService] ${channel} → user=${userId} template=${templateKey} success=${result.success}`);
    return { messageId: logEntry.id, result };
  }

  async broadcastToUsers(opts: BroadcastOptions): Promise<Array<{ userId: string; messageId: string; result: SendResult }>> {
    return Promise.all(
      opts.userIds.map((userId) =>
        this.sendToUser({ ...opts, userId }).then((r) => ({ userId, ...r })).catch((err) => ({
          userId,
          messageId: '',
          result: { success: false, error: err instanceof Error ? err.message : 'Error' },
        })),
      ),
    );
  }

  async sendBookingConfirmation(params: {
    userId: string;
    channel: ProviderChannel;
    appointmentId: string;
    clientName: string;
    specialistName: string;
    serviceName: string;
    date: string;
    time: string;
  }): Promise<SendResult> {
    const { userId, channel, appointmentId, ...vars } = params;
    const { result } = await this.sendToUser({
      userId, channel, appointmentId,
      templateKey: 'booking_confirmation',
      vars: { ...vars, salonName: process.env['SALON_NAME'] ?? 'Shante Lyur' },
    });
    return result;
  }

  async sendBookingReminder(params: {
    userId: string;
    channel: ProviderChannel;
    appointmentId: string;
    clientName: string;
    specialistName: string;
    serviceName: string;
    date: string;
    time: string;
    window: '24h' | '2h';
  }): Promise<SendResult> {
    const { userId, channel, appointmentId, window, ...vars } = params;
    const { result } = await this.sendToUser({
      userId, channel, appointmentId,
      templateKey: window === '2h' ? 'booking_reminder_2h' : 'booking_reminder_24h',
      vars: { ...vars, salonName: process.env['SALON_NAME'] ?? 'Shante Lyur' },
    });
    return result;
  }

  async sendCancellationNotice(params: {
    userId: string;
    channel: ProviderChannel;
    appointmentId: string;
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
  }): Promise<SendResult> {
    const { userId, channel, appointmentId, ...vars } = params;
    const { result } = await this.sendToUser({
      userId, channel, appointmentId,
      templateKey: 'booking_cancellation',
      vars,
    });
    return result;
  }

  async sendStaffAlert(params: {
    userId: string;
    channel: ProviderChannel;
    templateKey: string;
    vars: TemplateVariables;
  }): Promise<SendResult> {
    const { userId, channel, templateKey, vars } = params;
    const { result } = await this.sendToUser({ userId, channel, templateKey, vars });
    return result;
  }

  async getDeliveryStats(days = 30): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    byChannel: Record<string, { total: number; sent: number; failed: number }>;
    deliveryRate: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.outboundMessage.groupBy({
      by: ['channel', 'status'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    let total = 0, sent = 0, delivered = 0, failed = 0;
    const byChannel: Record<string, { total: number; sent: number; failed: number }> = {};

    for (const row of rows) {
      const ch = row.channel.toLowerCase();
      if (!byChannel[ch]) byChannel[ch] = { total: 0, sent: 0, failed: 0 };
      byChannel[ch].total += row._count;
      total += row._count;
      if (row.status === 'SENT' || row.status === 'DELIVERED' || row.status === 'READ') {
        sent += row._count;
        byChannel[ch].sent += row._count;
        if (row.status === 'DELIVERED' || row.status === 'READ') delivered += row._count;
      }
      if (row.status === 'FAILED' || row.status === 'DEAD_LETTER') {
        failed += row._count;
        byChannel[ch].failed += row._count;
      }
    }

    return { total, sent, delivered, failed, byChannel, deliveryRate: total > 0 ? Math.round((sent / total) * 100) : 0 };
  }

  private resolveRecipient(
    channel: ProviderChannel,
    pref: { whatsappPhone?: string | null; telegramChatId?: string | null; maxUserId?: string | null; emailEnabled?: boolean | null } | null,
    vars: TemplateVariables,
  ): string | null {
    switch (channel) {
      case 'whatsapp': return pref?.whatsappPhone ?? vars.phone ?? null;
      case 'telegram': return pref?.telegramChatId ?? null;
      case 'max': return pref?.maxUserId ?? null;
      case 'email': return pref?.emailEnabled !== false ? (vars.email ?? null) : null;
      default: return null;
    }
  }
}

let _service: MessagingService | null = null;

export function getMessagingService(): MessagingService {
  if (!_service) _service = new MessagingService();
  return _service;
}
