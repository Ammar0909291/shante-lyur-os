import { PrismaClient } from '@prisma/client';
import { INotificationPreferenceRepository } from '@/application/ports/notification-preference-repository.port';
import { NotificationPreference } from '@/domain/entities/notification-preference.entity';

export class PrismaNotificationPreferenceRepository implements INotificationPreferenceRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    userId: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    telegramEnabled: boolean;
    telegramChatId: string | null;
    appointmentReminders: boolean;
    followUpMessages: boolean;
    loyaltyUpdates: boolean;
    membershipReminders: boolean;
    marketingMessages: boolean;
    reminderLeadHours: number;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationPreference {
    return new NotificationPreference({
      id: raw.id,
      userId: raw.userId,
      emailEnabled: raw.emailEnabled,
      smsEnabled: raw.smsEnabled,
      pushEnabled: raw.pushEnabled,
      telegramEnabled: raw.telegramEnabled,
      telegramChatId: raw.telegramChatId ?? undefined,
      appointmentReminders: raw.appointmentReminders,
      followUpMessages: raw.followUpMessages,
      loyaltyUpdates: raw.loyaltyUpdates,
      membershipReminders: raw.membershipReminders,
      marketingMessages: raw.marketingMessages,
      reminderLeadHours: raw.reminderLeadHours,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    const raw = await (this.db as any).notificationPreference.findUnique({ where: { userId } });
    return raw ? this.toDomain(raw) : null;
  }

  async upsert(pref: NotificationPreference): Promise<NotificationPreference> {
    const data = {
      userId: pref.userId,
      emailEnabled: pref.emailEnabled,
      smsEnabled: pref.smsEnabled,
      pushEnabled: pref.pushEnabled,
      telegramEnabled: pref.telegramEnabled,
      telegramChatId: pref.telegramChatId ?? null,
      appointmentReminders: pref.appointmentReminders,
      followUpMessages: pref.followUpMessages,
      loyaltyUpdates: pref.loyaltyUpdates,
      membershipReminders: pref.membershipReminders,
      marketingMessages: pref.marketingMessages,
      reminderLeadHours: pref.reminderLeadHours,
    };
    const raw = await (this.db as any).notificationPreference.upsert({
      where: { userId: pref.userId },
      create: { id: pref.id, ...data },
      update: { ...data, updatedAt: new Date() },
    });
    return this.toDomain(raw);
  }
}
