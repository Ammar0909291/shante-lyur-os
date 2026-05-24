import { type Worker } from 'bullmq';
import { createNotificationWorker } from './workers/notification.worker';
import { createAppointmentReminderWorker } from './workers/appointment-reminder.worker';
import { createPaymentWebhookWorker } from './workers/payment-webhook.worker';
import { createAIPredictionWorker } from './workers/ai-prediction.worker';
import { createAuditLogWorker } from './workers/audit-log.worker';
import { createOmnichannelMessageWorker } from './workers/omnichannel-message.worker';

export {
  createNotificationWorker,
  createAppointmentReminderWorker,
  createPaymentWebhookWorker,
  createAIPredictionWorker,
  createAuditLogWorker,
  createOmnichannelMessageWorker,
};

let _workers: Worker[] = [];

/**
 * Start all BullMQ workers. Returns the array of active workers.
 */
export function startAllWorkers(): Worker[] {
  _workers = [
    createNotificationWorker(),
    createAppointmentReminderWorker(),
    createPaymentWebhookWorker(),
    createAIPredictionWorker(),
    createAuditLogWorker(),
    createOmnichannelMessageWorker(),
  ];

  console.info(`[WorkerRegistry] Started ${_workers.length} workers`);
  return _workers;
}

/**
 * Gracefully close all active workers.
 */
export async function stopAllWorkers(): Promise<void> {
  await Promise.all(_workers.map((w) => w.close()));
  _workers = [];
  console.info('[WorkerRegistry] All workers stopped');
}
