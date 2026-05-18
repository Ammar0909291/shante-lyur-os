import { NotificationPreference } from '@/domain/entities/notification-preference.entity';

export interface INotificationPreferenceRepository {
  findByUserId(userId: string): Promise<NotificationPreference | null>;
  upsert(pref: NotificationPreference): Promise<NotificationPreference>;
}
