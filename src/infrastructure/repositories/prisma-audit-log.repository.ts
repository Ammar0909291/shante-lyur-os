import { PrismaClient, Prisma } from '@prisma/client';
import { AuditLogRepositoryPort } from '@/application/ports/audit-log-repository.port';
import { AuditLog } from '@/domain/entities/audit-log.entity';
import { AuditAction } from '@/domain/enums/audit-action.enum';

export class PrismaAuditLogRepository implements AuditLogRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; userId: string | null; action: string; entityType: string; entityId: string | null; oldValue: unknown | null; newValue: unknown | null; ipAddress: string | null; userAgent: string | null; createdAt: Date }): AuditLog {
    return AuditLog.reconstitute({
      id: raw.id,
      userId: raw.userId ?? undefined,
      action: raw.action as AuditAction,
      entityType: raw.entityType,
      entityId: raw.entityId ?? undefined,
      oldValue: (raw.oldValue as Record<string, unknown>) ?? undefined,
      newValue: (raw.newValue as Record<string, unknown>) ?? undefined,
      ipAddress: raw.ipAddress ?? undefined,
      userAgent: raw.userAgent ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<AuditLog | null> {
    const raw = await this.db.auditLog.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: { userId?: string; action?: AuditAction; entityType?: string; entityId?: string; from?: Date; to?: Date; page?: number; limit?: number }): Promise<{ items: AuditLog[]; total: number }> {
    const { userId, action, entityType, entityId, from, to, page = 1, limit = 50 } = options;
    const where: Prisma.AuditLogWhereInput = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (from || to) where.createdAt = {};
    if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
    if (to) (where.createdAt as Prisma.DateTimeFilter).lte = to;

    const [raws, total] = await Promise.all([
      this.db.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.auditLog.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(log: AuditLog): Promise<AuditLog> {
    const raw = await this.db.auditLog.create({
      data: {
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValue: log.oldValue as Prisma.InputJsonValue,
        newValue: log.newValue as Prisma.InputJsonValue,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      },
    });
    return this.toDomain(raw);
  }
}
