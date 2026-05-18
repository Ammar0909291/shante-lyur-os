import { Notification } from '@/domain/entities';
import { NotificationStatus, NotificationType } from '@/domain/enums';

export interface NotificationRepositoryPort {
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: {
    status?: NotificationStatus;
    type?: NotificationType;
    page?: number;
    limit?: number;
  }): Promise<{ items: Notification[]; total: number }>;
  findPending(limit: number): Promise<Notification[]>;
  create(notification: Notification): Promise<Notification>;
  update(notification: Notification): Promise<Notification>;
  markAllAsRead(userId: string): Promise<number>;
}

export type INotificationRepository = NotificationRepositoryPort;
