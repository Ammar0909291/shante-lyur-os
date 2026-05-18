import { NotificationChannel } from '@/domain/enums';

export interface NotificationServicePort {
  send(params: {
    userId: string;
    type: string;
    channel: NotificationChannel;
    title: string;
    body: string;
    appointmentId?: string;
    data?: Record<string, unknown>;
  }): Promise<void>;

  sendBulk(params: {
    userIds: string[];
    type: string;
    channel: NotificationChannel;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void>;
}
