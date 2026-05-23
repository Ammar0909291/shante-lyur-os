import { NotificationServicePort } from '@/application/ports/notification-service.port';
import { EmailServicePort } from '@/application/ports/email-service.port';
import { NotificationRepositoryPort } from '@/application/ports/notification-repository.port';
import { Notification } from '@/domain/entities/notification.entity';
import { NotificationType } from '@/domain/enums/notification-type.enum';
import { NotificationChannel } from '@/domain/enums/notification-channel.enum';
import { NotificationStatus } from '@/domain/enums/notification-status.enum';
import { User } from '@/domain/entities/user.entity';

export class NotificationService implements NotificationServicePort {
  constructor(
    private readonly emailService: EmailServicePort,
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  async sendBookingConfirmation(user: User, appointment: { serviceName: string; specialistName: string; date: string; time: string }): Promise<void> {
    await this.sendEmail(user, 'booking-confirmation', {
      name: `${user.firstName} ${user.lastName}`,
      service: appointment.serviceName,
      specialist: appointment.specialistName,
      date: appointment.date,
      time: appointment.time,
    });
    await this.createNotification(user.id, NotificationType.APPOINTMENT_CONFIRMED, 'Запись подтверждена', `Ваша запись на ${appointment.serviceName} подтверждена`, NotificationChannel.EMAIL);
  }

  async sendBookingReminder(user: User, appointment: { serviceName: string; date: string; time: string }): Promise<void> {
    await this.sendEmail(user, 'booking-reminder', {
      name: `${user.firstName} ${user.lastName}`,
      service: appointment.serviceName,
      date: appointment.date,
      time: appointment.time,
    });
    await this.createNotification(user.id, NotificationType.APPOINTMENT_REMINDER, 'Напоминание о записи', `Напоминаем о записи на ${appointment.serviceName} завтра в ${appointment.time}`, NotificationChannel.EMAIL);
  }

  async sendPaymentReceipt(user: User, payment: { amount: string; currency: string; serviceName: string; date: string }): Promise<void> {
    await this.sendEmail(user, 'payment-receipt', {
      name: `${user.firstName} ${user.lastName}`,
      amount: payment.amount,
      currency: payment.currency,
      service: payment.serviceName,
      date: payment.date,
    });
    await this.createNotification(user.id, NotificationType.PAYMENT_RECEIVED, 'Оплата получена', `Оплата ${payment.amount} ${payment.currency} получена`, NotificationChannel.EMAIL);
  }

  async sendWelcome(user: User): Promise<void> {
    await this.sendEmail(user, 'welcome', {
      name: `${user.firstName} ${user.lastName}`,
    });
  }

  async sendPasswordReset(user: User, resetLink: string): Promise<void> {
    await this.sendEmail(user, 'password-reset', {
      name: `${user.firstName} ${user.lastName}`,
      link: resetLink,
    });
  }

  async sendAccountLocked(user: User): Promise<void> {
    await this.sendEmail(user, 'account-locked', {
      name: `${user.firstName} ${user.lastName}`,
    });
  }

  async sendCancellationNotice(user: User, appointment: { serviceName: string; date: string; time: string }): Promise<void> {
    await this.createNotification(user.id, NotificationType.APPOINTMENT_CANCELLED, 'Запись отменена', `Ваша запись на ${appointment.serviceName} (${appointment.date} ${appointment.time}) отменена`, NotificationChannel.EMAIL);
  }

  private async sendEmail(user: User, template: string, variables: Record<string, string>): Promise<void> {
    if (!user.email) return;
    try {
      await this.emailService.sendTemplate(user.email.toString(), template, variables);
    } catch {
      // Log but don't fail the main flow
    }
  }

  private async createNotification(userId: string | undefined, type: NotificationType, title: string, body: string, channel: NotificationChannel): Promise<void> {
    if (!userId) return;
    const notification = Notification.create({
      userId,
      type,
      title,
      body,
      channel,
      status: NotificationStatus.PENDING,
    });
    await this.notificationRepo.create(notification);
  }
}
