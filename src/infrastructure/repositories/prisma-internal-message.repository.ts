import { PrismaClient } from '@prisma/client';
import { IInternalMessageRepository, InternalMessageRecord } from '@/application/ports/internal-message-repository.port';
import { MessageVisibility } from '@/domain/enums';

function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`.trim();
}

export class PrismaInternalMessageRepository implements IInternalMessageRepository {
  constructor(private readonly db: PrismaClient) {}

  async findForUser(
    userId: string,
    options: {
      appointmentId?: string;
      profileId?: string;
      visibility?: MessageVisibility;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ items: InternalMessageRecord[]; total: number }> {
    const limit  = options.limit  ?? 50;
    const offset = options.offset ?? 0;

    // Visible = BROADCAST OR (DIRECT where I'm sender/recipient)
    const visibilityWhere = options.visibility
      ? { visibility: options.visibility as never }
      : {
          OR: [
            { visibility: 'BROADCAST' as never },
            { AND: [{ visibility: 'DIRECT' as never }, { OR: [{ senderId: userId }, { recipientId: userId }] }] },
          ],
        };

    const where = {
      ...visibilityWhere,
      ...(options.appointmentId ? { appointmentId: options.appointmentId } : {}),
      ...(options.profileId     ? { profileId: options.profileId }         : {}),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.internalMessage.findMany({
        where,
        include: { sender: true, recipient: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.internalMessage.count({ where }),
    ]);

    return {
      items: rows.map(r => this.toRecord(r)),
      total,
    };
  }

  async create(data: {
    senderId: string;
    recipientId?: string;
    content: string;
    appointmentId?: string;
    profileId?: string;
    visibility: MessageVisibility;
  }): Promise<InternalMessageRecord> {
    const row = await this.db.internalMessage.create({
      data: {
        senderId:      data.senderId,
        recipientId:   data.recipientId   ?? null,
        content:       data.content,
        appointmentId: data.appointmentId ?? null,
        profileId:     data.profileId     ?? null,
        visibility:    data.visibility    as never,
      },
      include: { sender: true, recipient: true },
    });
    return this.toRecord(row);
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.db.internalMessage.updateMany({
      where: {
        id,
        OR: [{ senderId: userId }, { recipientId: userId }, { visibility: 'BROADCAST' as never }],
      },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.db.internalMessage.count({
      where: {
        isRead: false,
        OR: [
          { visibility: 'BROADCAST' as never },
          { AND: [{ visibility: 'DIRECT' as never }, { OR: [{ senderId: userId }, { recipientId: userId }] }] },
        ],
      },
    });
  }

  private toRecord(r: {
    id: string; senderId: string; recipientId: string | null;
    content: string; appointmentId: string | null; profileId: string | null;
    visibility: string; isRead: boolean; readAt: Date | null; createdAt: Date;
    sender: { firstName: string; lastName: string };
    recipient: { firstName: string; lastName: string } | null;
  }): InternalMessageRecord {
    return {
      id:            r.id,
      senderId:      r.senderId,
      senderName:    fullName(r.sender),
      recipientId:   r.recipientId,
      recipientName: r.recipient ? fullName(r.recipient) : null,
      content:       r.content,
      appointmentId: r.appointmentId,
      profileId:     r.profileId,
      visibility:    r.visibility as MessageVisibility,
      isRead:        r.isRead,
      readAt:        r.readAt,
      createdAt:     r.createdAt,
    };
  }
}
