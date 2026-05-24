export interface AppointmentReminderJob {
  appointmentId: string;
  customerId: string;
  specialistId: string;
  scheduledAt: string;
  reminderType: '24h' | '2h' | '30m';
}

export interface NotificationJob {
  notificationId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  recipientId: string;
  templateKey: string;
  data: Record<string, unknown>;
}

export interface OmnichannelMessageJob {
  outboundMessageId: string;
  userId: string;
  channel: 'whatsapp' | 'telegram' | 'max' | 'email';
  templateKey: string;
  vars: Record<string, string>;
  appointmentId?: string;
  retryCount?: number;
  lang?: 'ru' | 'en';
}

export interface PaymentWebhookJob {
  provider: 'yookassa' | 'robokassa';
  rawPayload: string;
  signature: string;
  receivedAt: string;
}

export interface AIPredictionJob {
  type: 'no_show' | 'churn' | 'revenue_forecast' | 'slot_recommendation';
  entityId: string;
  contextData: Record<string, unknown>;
}

export interface AuditLogJob {
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
}

export interface ReportGenerationJob {
  reportType: 'revenue' | 'specialist' | 'customer';
  startDate: string;
  endDate: string;
  requestedBy: string;
  locationId?: string;
}
