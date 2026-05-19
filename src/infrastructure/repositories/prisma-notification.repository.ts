import { PrismaClient, Prisma } from '@prisma/client';
import { INotificationRepository } from '@/application/ports/notification-repository.port';
import { Notification } from '@/domain/entities/notification.entity';
import { NotificationType } from '@/domain/enums/notification-type.enum';
import { NotificationStatus } from '@/domain/enums/notification-status.enum';
import { NotificationChannel } from '@/domain/enums/notification-channel.enum';

type RawNotification = {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  data: unknown;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  error: string | null;
  createdAt: Date;
};

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: RawNotification): Notification {
    return new Notification({
      id: raw.id,
      userId: raw.userId,
      appointmentId: raw.appointmentId ?? undefined,
      type: raw.type as NotificationType,
      channel: raw.channel as NotificationChannel,
      status: raw.status as NotificationStatus,
      title: raw.title,
      body: raw.body,
      data: (raw.data as Record<string, unknown>) ?? undefined,
      sentAt: raw.sentAt ?? undefined,
      deliveredAt: raw.deliveredAt ?? undefined,
      readAt: raw.readAt ?? undefined,
      error: raw.error ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const raw = await this.db.notification.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawNotification) : null;
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
      this.db.notification.count({ where: { userId, readAt: null, status: { not: NotificationStatus.FAILED } } }),
    ]);
    return { items: raws.map(r => this.toDomain(r as unknown as RawNotification)), total, unread };
  }

  async findPending(limit: number): Promise<Notification[]> {
    const raws = await this.db.notification.findMany({
      where: { status: NotificationStatus.PENDING },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawNotification));
  }

  async create(notification: Notification): Promise<Notification> {
    const raw = await this.db.notification.create({
      data: {
        id: notification.id,
        userId: notification.userId,
        appointmentId: notification.appointmentId,
        type: notification.type,
        channel: notification.channel,
        status: notification.status,
        title: notification.title,
        body: notification.body,
        data: notification.data ? (notification.data as Prisma.InputJsonValue) : Prisma.JsonNull,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
        error: notification.error,
      },
    });
    return this.toDomain(raw as unknown as RawNotification);
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
    return this.toDomain(raw as unknown as RawNotification);
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
