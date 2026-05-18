import { NotificationRepositoryPort } from '../../ports/notification-repository.port';
import { IUserRepository } from '../../ports/user-repository.port';
import { NotFoundError } from '../../../domain/errors';

export class GetCommunicationHistoryUseCase {
  constructor(
    private readonly notificationRepo: NotificationRepositoryPort,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, options?: { page?: number; limit?: number }) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const { items, total } = await this.notificationRepo.findByUserId(userId, {
      page: options?.page ?? 1,
      limit: options?.limit ?? 30,
    });

    return {
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email },
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
    };
  }
}
