import { PrismaClient, Prisma } from '@prisma/client';
import { NotificationRepositoryPort } from '@/application/ports/notification-repository.port';
import { Notification } from '@/domain/entities/notification.entity';
import { NotificationType } from '@/domain/enums/notification-type.enum';
import { NotificationStatus } from '@/domain/enums/notification-status.enum';

export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(raw: any): Notification {
    return Notification.reconstitute({
      id: raw.id,
      userId: raw.userId,
      appointmentId: raw.appointmentId ?? undefined,
      type: raw.type as NotificationType,
      title: raw.title,
      body: raw.body,
      channel: raw.channel,
      status: raw.status as NotificationStatus,
      data: raw.data ?? undefined,
      sentAt: raw.sentAt ?? undefined,
      deliveredAt: raw.deliveredAt ?? undefined,
      readAt: raw.readAt ?? undefined,
      error: raw.error ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const raw = await this.db.notification.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUser(userId: string, options?: {
    status?: NotificationStatus;
    type?: NotificationType;
    page?: number;
    limit?: number;
  }): Promise<{ items: Notification[]; total: number; unread: number }> {
    const { status, type, page = 1, limit = 20 } = options ?? {};
    const where: Prisma.NotificationWhereInput = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [raws, total, unread] = await Promise.all([
      this.db.notification.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total, unread };
  }

  async create(notification: Notification): Promise<Notification> {
    const raw = await this.db.notification.create({
      data: {
        id: notification.id,
        userId: notification.userId,
        appointmentId: notification.appointmentId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        channel: notification.channel,
        status: notification.status,
        data: notification.data as Prisma.InputJsonValue,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
        error: notification.error,
      },
    });
    return this.toDomain(raw);
  }

  async update(notification: Notification): Promise<Notification> {
    const raw = await this.db.notification.update({
      where: { id: notification.id },
      data: {
        status: notification.status,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
        error: notification.error,
      },
    });
    return this.toDomain(raw);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  async deleteOldNotifications(before: Date): Promise<number> {
    const result = await this.db.notification.deleteMany({
      where: { createdAt: { lt: before } },
    });
    return result.count;
  }
}
