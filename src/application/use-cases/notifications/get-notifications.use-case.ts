import { NotificationRepositoryPort } from '../../ports/notification-repository.port';
import { NotificationStatus, NotificationType } from '../../../domain/enums';

export class GetNotificationsUseCase {
  constructor(private readonly notificationRepo: NotificationRepositoryPort) {}

  async execute(userId: string, options?: { status?: NotificationStatus; type?: NotificationType; page?: number; limit?: number }) {
    const { items, total } = await this.notificationRepo.findByUserId(userId, options);
    const unread = items.filter(n => !n.isRead).length;
    return {
      items: items.map(n => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        status: n.status,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        sentAt: n.sentAt,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      total,
      unread,
    };
  }
}
