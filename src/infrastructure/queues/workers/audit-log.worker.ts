import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { AuditLogJob } from '../job-types';
import { di } from '@/infrastructure/config/di-registry';
import { AuditLog } from '@/domain/entities/audit-log.entity';
import { AuditAction } from '@/domain/enums/audit-action.enum';

function createProcessor() {
  return async (job: Job<AuditLogJob>): Promise<void> => {
    const { action, userId, resourceType, resourceId, metadata, ipAddress } = job.data;
    const registry = di();

    console.info(
      `[AuditLogWorker] Processing job ${job.id}: action=${action}, userId=${userId}, resource=${resourceType}/${resourceId}`,
    );

    const auditLog = AuditLog.create({
      action: action as AuditAction,
      userId,
      entityType: resourceType,
      entityId: resourceId,
      metadata,
      ipAddress,
    });

    await registry.auditLogRepository.create(auditLog);

    console.info(`[AuditLogWorker] Job ${job.id} completed — audit log ${auditLog.id} created`);
  };
}

export function createAuditLogWorker(): Worker<AuditLogJob> {
  const worker = new Worker<AuditLogJob>(
    QUEUE_NAMES.AUDIT_LOGS,
    createProcessor(),
    { connection: redisConnection },
  );

  worker.on('completed', (job: Job<AuditLogJob>) => {
    console.info(`[AuditLogWorker] Job ${job.id} finished`);
  });

  worker.on('failed', (job: Job<AuditLogJob> | undefined, err: Error) => {
    console.error(
      `[AuditLogWorker] Job ${job?.id ?? 'unknown'} failed:`,
      err.message,
    );
  });

  return worker;
}
