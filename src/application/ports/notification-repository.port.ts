import { Notification } from '@/domain/entities';
import { NotificationStatus, NotificationType } from '@/domain/enums';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUser(userId: string, options?: {
    status?: NotificationStatus;
    type?: NotificationType;
    page?: number;
    limit?: number;
  }): Promise<{ items: Notification[]; total: number; unread: number }>;
  create(notification: Notification): Promise<Notification>;
  update(notification: Notification): Promise<Notification>;
  markAllRead(userId: string): Promise<void>;
  deleteOldNotifications(before: Date): Promise<number>;
}

export type NotificationRepositoryPort = INotificationRepository;
