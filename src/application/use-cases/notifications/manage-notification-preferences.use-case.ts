import { INotificationPreferenceRepository } from '../../ports/notification-preference-repository.port';
import { NotificationPreference } from '../../../domain/entities/notification-preference.entity';

export class ManageNotificationPreferencesUseCase {
  constructor(private readonly prefRepo: INotificationPreferenceRepository) {}

  async get(userId: string): Promise<NotificationPreference> {
    const pref = await this.prefRepo.findByUserId(userId);
    if (pref) return pref;
    return NotificationPreference.createDefault(userId);
  }

  async update(
    userId: string,
    patch: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
      telegramEnabled?: boolean;
      telegramChatId?: string;
      appointmentReminders?: boolean;
      followUpMessages?: boolean;
      loyaltyUpdates?: boolean;
      membershipReminders?: boolean;
      marketingMessages?: boolean;
      reminderLeadHours?: number;
    },
  ): Promise<NotificationPreference> {
    let pref = await this.prefRepo.findByUserId(userId);
    if (!pref) {
      pref = NotificationPreference.createDefault(userId);
    }
    pref.update(patch);
    return this.prefRepo.upsert(pref);
  }
}
