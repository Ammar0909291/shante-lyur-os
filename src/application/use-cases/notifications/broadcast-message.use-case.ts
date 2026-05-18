import { NotificationRepositoryPort } from '../../ports/notification-repository.port';
import { IUserRepository } from '../../ports/user-repository.port';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../../domain/enums/notification-channel.enum';
import { NotificationStatus } from '../../../domain/enums/notification-status.enum';
import { UserRole } from '../../../domain/enums';

export class BroadcastMessageUseCase {
  constructor(
    private readonly notificationRepo: NotificationRepositoryPort,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: {
    title: string;
    body: string;
    targetRole?: UserRole;
    channel?: NotificationChannel;
    senderId: string;
  }): Promise<{ queued: number }> {
    const channel = input.channel ?? NotificationChannel.IN_APP;

    const { items: users } = await this.userRepo.findMany({
      role: input.targetRole,
      limit: 500,
    });

    let queued = 0;
    for (const user of users) {
      const notification = Notification.create({
        userId: user.id,
        type: NotificationType.SYSTEM,
        channel,
        status: NotificationStatus.PENDING,
        title: input.title,
        body: input.body,
        data: { sentBy: input.senderId, broadcast: true },
      });
      await this.notificationRepo.create(notification);
      queued++;
    }

    return { queued };
  }
}
