import { Queue } from 'bullmq';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from './queue.config';
import { redisConnection } from './redis-connection';
import type {
  AppointmentReminderJob,
  NotificationJob,
  PaymentWebhookJob,
  AIPredictionJob,
  AuditLogJob,
  ReportGenerationJob,
  SaleNotificationJob,
} from './job-types';

export const appointmentRemindersQueue = new Queue<AppointmentReminderJob>(
  QUEUE_NAMES.APPOINTMENT_REMINDERS,
  { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const notificationsQueue = new Queue<NotificationJob>(
  QUEUE_NAMES.NOTIFICATIONS,
  { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const paymentWebhooksQueue = new Queue<PaymentWebhookJob>(
  QUEUE_NAMES.PAYMENT_WEBHOOKS,
  { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const aiPredictionsQueue = new Queue<AIPredictionJob>(
  QUEUE_NAMES.AI_PREDICTIONS,
  { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const auditLogsQueue = new Queue<AuditLogJob>(
  QUEUE_NAMES.AUDIT_LOGS,
  { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const reportGenerationQueue = new Queue<ReportGenerationJob>(
  QUEUE_NAMES.REPORT_GENERATION,
  { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const saleNotificationsQueue = new Queue<SaleNotificationJob>(
  QUEUE_NAMES.SALE_NOTIFICATIONS,
  { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const queues: Map<string, Queue> = new Map<string, Queue>([
  [QUEUE_NAMES.APPOINTMENT_REMINDERS, appointmentRemindersQueue as Queue],
  [QUEUE_NAMES.NOTIFICATIONS, notificationsQueue as Queue],
  [QUEUE_NAMES.PAYMENT_WEBHOOKS, paymentWebhooksQueue as Queue],
  [QUEUE_NAMES.AI_PREDICTIONS, aiPredictionsQueue as Queue],
  [QUEUE_NAMES.AUDIT_LOGS, auditLogsQueue as Queue],
  [QUEUE_NAMES.REPORT_GENERATION, reportGenerationQueue as Queue],
  [QUEUE_NAMES.SALE_NOTIFICATIONS, saleNotificationsQueue as Queue],
]);

export async function gracefulShutdown(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
}
