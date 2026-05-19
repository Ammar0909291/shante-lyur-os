import { PrismaClient, Prisma } from '@prisma/client';
import { IAuditLogRepository } from '@/application/ports/audit-log-repository.port';
import { AuditLog } from '@/domain/entities/audit-log.entity';
import { AuditAction } from '@/domain/enums/audit-action.enum';

export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    userId: string | null;
    appointmentId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    oldValues: Prisma.JsonValue | null;
    newValues: Prisma.JsonValue | null;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }): AuditLog {
    return new AuditLog({
      id: raw.id,
      userId: raw.userId ?? undefined,
      appointmentId: raw.appointmentId ?? undefined,
      action: raw.action as AuditAction,
      entityType: raw.entityType,
      entityId: raw.entityId ?? undefined,
      oldValues: (raw.oldValues as Record<string, unknown>) ?? undefined,
      newValues: (raw.newValues as Record<string, unknown>) ?? undefined,
      ipAddress: raw.ipAddress ?? undefined,
      userAgent: raw.userAgent ?? undefined,
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<AuditLog | null> {
    const raw = await this.db.auditLog.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: AuditLog[]; total: number }> {
    const { userId, action, entityType, entityId, from, to, page = 1, limit = 50 } = options;
    const where: Prisma.AuditLogWhereInput = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = to;
    }

    const [raws, total] = await Promise.all([
      this.db.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.auditLog.count({ where }),
    ]);
    return { items: raws.map((r) => this.toDomain(r)), total };
  }

  async create(log: AuditLog): Promise<AuditLog> {
    const raw = await this.db.auditLog.create({
      data: {
        id: log.id,
        userId: log.userId ?? null,
        appointmentId: log.appointmentId ?? null,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? null,
        oldValues: (log.oldValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        newValues: (log.newValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: log.ipAddress ?? null,
        userAgent: log.userAgent ?? null,
        metadata: (log.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
    return this.toDomain(raw);
  }

  async getRecentActions(userId: string, limit: number): Promise<AuditLog[]> {
    const raws = await this.db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return raws.map((r) => this.toDomain(r));
  }
}
