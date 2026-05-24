export type ProviderChannel = 'whatsapp' | 'telegram' | 'max' | 'email' | 'sms' | 'in_app';

export interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
  providerResponse?: Record<string, unknown>;
}

export interface MessagePayload {
  to: string;
  body: string;
  subject?: string;
  templateName?: string;
  templateData?: Record<string, string>;
  language?: 'ru' | 'en';
}

export interface DeliveryRecord {
  messageId: string;
  channel: ProviderChannel;
  provider: string;
  recipientId: string;
  status: 'sent' | 'delivered' | 'failed';
  externalId?: string;
  error?: string;
  sentAt: Date;
}

export interface TemplateVariables {
  clientName?: string;
  specialistName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  salonName?: string;
  amount?: string;
  currency?: string;
  phone?: string;
  resetLink?: string;
  promoCode?: string;
  discount?: string;
  [key: string]: string | undefined;
}

export type NotificationTrigger =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'booking_reminder_24h'
  | 'booking_reminder_2h'
  | 'payment_received'
  | 'payment_failed'
  | 'welcome'
  | 'staff_alert'
  | 'operational_alert'
  | 'promotional';
