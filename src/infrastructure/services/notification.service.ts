import { v4 as uuidv4 } from 'uuid';
import { NotificationServicePort } from '@/application/ports/notification-service.port';
import { EmailServicePort } from '@/application/ports/email-service.port';
import { NotificationRepositoryPort } from '@/application/ports/notification-repository.port';
import { Notification } from '@/domain/entities/notification.entity';
import { NotificationType } from '@/domain/enums/notification-type.enum';
import { NotificationChannel } from '@/domain/enums/notification-channel.enum';
import { NotificationStatus } from '@/domain/enums/notification-status.enum';

export class NotificationService implements NotificationServicePort {
  constructor(
    private readonly emailService: EmailServicePort,
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  async send(params: {
    userId: string;
    type: string;
    channel: NotificationChannel;
    title: string;
    body: string;
    appointmentId?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    await this.createNotification(
      params.userId,
      params.type as NotificationType,
      params.title,
      params.body,
      params.channel,
      params.appointmentId,
      params.data,
    );
  }

  async sendBulk(params: {
    userIds: string[];
    type: string;
    channel: NotificationChannel;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    await Promise.all(params.userIds.map(userId =>
      this.createNotification(userId, params.type as NotificationType, params.title, params.body, params.channel, undefined, params.data)
    ));
  }

  async sendBookingConfirmation(userId: string, userEmail: string, userName: string, appointment: {
    serviceName: string;
    specialistName: string;
    date: string;
    time: string;
  }): Promise<void> {
    await this.emailService.sendTemplate(userEmail, 'booking-confirmation', {
      name: userName,
      service: appointment.serviceName,
      specialist: appointment.specialistName,
      date: appointment.date,
      time: appointment.time,
    });
    await this.createNotification(userId, NotificationType.APPOINTMENT_CONFIRMED, 'Запись подтверждена', `Ваша запись на ${appointment.serviceName} подтверждена`, NotificationChannel.EMAIL);
  }

  async sendBookingReminder(userId: string, userEmail: string, userName: string, appointment: {
    serviceName: string;
    date: string;
    time: string;
  }): Promise<void> {
    await this.emailService.sendTemplate(userEmail, 'booking-reminder', {
      name: userName,
      service: appointment.serviceName,
      date: appointment.date,
      time: appointment.time,
    });
    await this.createNotification(userId, NotificationType.APPOINTMENT_REMINDER, 'Напоминание о записи', `Напоминаем о записи на ${appointment.serviceName} ${appointment.date} в ${appointment.time}`, NotificationChannel.EMAIL);
  }

  async sendCancellationNotice(userId: string, appointment: { serviceName: string; date: string; time: string }): Promise<void> {
    await this.createNotification(userId, NotificationType.APPOINTMENT_CANCELLED, 'Запись отменена', `Ваша запись на ${appointment.serviceName} (${appointment.date} ${appointment.time}) отменена`, NotificationChannel.EMAIL);
  }

  async sendPaymentReceipt(userId: string, userEmail: string, userName: string, payment: {
    amount: string;
    currency: string;
    serviceName: string;
    date: string;
  }): Promise<void> {
    await this.emailService.sendTemplate(userEmail, 'payment-receipt', {
      name: userName,
      amount: payment.amount,
      currency: payment.currency,
      service: payment.serviceName,
      date: payment.date,
    });
    await this.createNotification(userId, NotificationType.PAYMENT_RECEIVED, 'Оплата получена', `Оплата ${payment.amount} ${payment.currency} получена`, NotificationChannel.EMAIL);
  }

  private async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    channel: NotificationChannel,
    appointmentId?: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const notification = new Notification({
      id: uuidv4(),
      userId,
      appointmentId,
      type,
      channel,
      status: NotificationStatus.PENDING,
      title,
      body,
      data,
      createdAt: new Date(),
    });
    await this.notificationRepo.create(notification);
  }
}
