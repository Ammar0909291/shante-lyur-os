import { PrismaClient, Prisma } from '@prisma/client';
import { NotificationRepositoryPort } from '@/application/ports/notification-repository.port';
import { Notification } from '@/domain/entities/notification.entity';
import { NotificationType } from '@/domain/enums/notification-type.enum';
import { NotificationStatus } from '@/domain/enums/notification-status.enum';
import { NotificationChannel } from '@/domain/enums/notification-channel.enum';

export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    userId: string | null;
    appointmentId?: string | null;
    type: string;
    title: string;
    body: string;
    channel: string;
    status: string;
    data?: unknown | null;
    sentAt: Date | null;
    deliveredAt?: Date | null;
    readAt: Date | null;
    error?: string | null;
    createdAt: Date;
  }): Notification {
    return Notification.reconstitute({
      id: raw.id,
      userId: raw.userId ?? undefined,
      appointmentId: raw.appointmentId ?? undefined,
      type: raw.type as NotificationType,
      title: raw.title,
      body: raw.body,
      channel: raw.channel as NotificationChannel,
      status: raw.status as NotificationStatus,
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
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string, options?: { status?: NotificationStatus; type?: NotificationType; page?: number; limit?: number }): Promise<{ items: Notification[]; total: number }> {
    const { status, type, page = 1, limit = 20 } = options ?? {};
    const where: Prisma.NotificationWhereInput = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [raws, total] = await Promise.all([
      this.db.notification.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.notification.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async findPending(limit: number): Promise<Notification[]> {
    const raws = await this.db.notification.findMany({
      where: { status: NotificationStatus.PENDING },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return raws.map(r => this.toDomain(r));
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
        sentAt: notification.sentAt,
        readAt: notification.readAt,
        data: notification.data as Prisma.InputJsonValue,
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
        readAt: notification.readAt,
        error: notification.error,
      },
    });
    return this.toDomain(raw);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return result.count;
  }
}
