import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export type AuditLogRepositoryPort = IAuditLogRepository;

export interface IAuditLogRepository {
  findById(id: string): Promise<AuditLog | null>;
  findMany(options: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: AuditLog[]; total: number }>;
  create(auditLog: AuditLog): Promise<AuditLog>;
  getRecentActions(userId: string, limit: number): Promise<AuditLog[]>;
}
