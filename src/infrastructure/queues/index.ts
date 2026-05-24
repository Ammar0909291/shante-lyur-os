// Queue configuration
export * from './queue.config';

// Job type interfaces
export * from './job-types';

// Shared Redis connection
export { redisConnection } from './redis-connection';

// Queue instances and graceful shutdown
export {
  appointmentRemindersQueue,
  notificationsQueue,
  paymentWebhooksQueue,
  aiPredictionsQueue,
  auditLogsQueue,
  reportGenerationQueue,
  omnichannelQueue,
  queues,
  gracefulShutdown,
} from './queue-registry';

// Worker factory functions and lifecycle management
export {
  createNotificationWorker,
  createAppointmentReminderWorker,
  createPaymentWebhookWorker,
  createAIPredictionWorker,
  createAuditLogWorker,
  startAllWorkers,
  stopAllWorkers,
} from './worker-registry';
