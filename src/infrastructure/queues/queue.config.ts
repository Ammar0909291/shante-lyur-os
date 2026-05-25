// Queue names as const enum for type safety
export const QUEUE_NAMES = {
  APPOINTMENT_REMINDERS: 'appointment-reminders',
  NOTIFICATIONS: 'notifications',
  PAYMENT_WEBHOOKS: 'payment-webhooks',
  AI_PREDICTIONS: 'ai-predictions',
  AUDIT_LOGS: 'audit-logs',
  REPORT_GENERATION: 'report-generation',
  SALE_NOTIFICATIONS: 'sale-notifications',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Default job options
export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
};
