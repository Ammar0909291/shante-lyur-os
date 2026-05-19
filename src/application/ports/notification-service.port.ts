import { User } from '@/domain/entities';

export type NotificationServicePort = INotificationService;
export interface INotificationService {
  sendBookingConfirmation(user: User, appointment: { serviceName: string; specialistName: string; date: string; time: string }): Promise<void>;
  sendBookingReminder(user: User, appointment: { serviceName: string; date: string; time: string }): Promise<void>;
  sendPaymentReceipt(user: User, payment: { amount: string; currency: string; serviceName: string; date: string }): Promise<void>;
  sendWelcome(user: User): Promise<void>;
  sendPasswordReset(user: User, resetLink: string): Promise<void>;
  sendAccountLocked(user: User): Promise<void>;
  sendCancellationNotice(user: User, appointment: { serviceName: string; date: string; time: string }): Promise<void>;
}
