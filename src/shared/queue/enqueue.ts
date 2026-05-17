import { type JobsOptions } from 'bullmq';
import {
  appointmentRemindersQueue,
  notificationsQueue,
  paymentWebhooksQueue,
  aiPredictionsQueue,
  auditLogsQueue,
  reportGenerationQueue,
} from '@/infrastructure/queues/queue-registry';
import type {
  AppointmentReminderJob,
  NotificationJob,
  PaymentWebhookJob,
  AIPredictionJob,
  AuditLogJob,
  ReportGenerationJob,
} from '@/infrastructure/queues/job-types';

export async function enqueueNotification(
  job: NotificationJob,
  opts?: JobsOptions,
): Promise<void> {
  await notificationsQueue.add('notification', job, opts);
}

export async function enqueueAppointmentReminder(
  job: AppointmentReminderJob,
  opts?: JobsOptions,
): Promise<void> {
  await appointmentRemindersQueue.add('appointment-reminder', job, opts);
}

export async function enqueuePaymentWebhook(
  job: PaymentWebhookJob,
  opts?: JobsOptions,
): Promise<void> {
  await paymentWebhooksQueue.add('payment-webhook', job, opts);
}

export async function enqueueAIPrediction(
  job: AIPredictionJob,
  opts?: JobsOptions,
): Promise<void> {
  await aiPredictionsQueue.add('ai-prediction', job, opts);
}

export async function enqueueAuditLog(
  job: AuditLogJob,
  opts?: JobsOptions,
): Promise<void> {
  await auditLogsQueue.add('audit-log', job, opts);
}

export async function enqueueReportGeneration(
  job: ReportGenerationJob,
  opts?: JobsOptions,
): Promise<void> {
  await reportGenerationQueue.add('report-generation', job, opts);
}
