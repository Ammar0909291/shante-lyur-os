import { NotificationRepositoryPort } from '../../ports/notification-repository.port';
import { NotFoundError } from '../../../domain/errors';

export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepo: NotificationRepositoryPort) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification) throw new NotFoundError('Notification', notificationId);
    if (notification.userId !== userId) throw new NotFoundError('Notification', notificationId);
    if (notification.isRead) return;
    notification.markRead();
    await this.notificationRepo.update(notification);
  }

  async markAll(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.markAllAsRead(userId);
    return { count };
  }
}
