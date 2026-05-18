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
    await this.createNotification(user.id, NotificationType.WELCOME, 'Добро пожаловать!', `Рады приветствовать вас в Shante Lyur`, NotificationChannel.EMAIL);
  }

  async sendPasswordReset(user: User, resetLink: string): Promise<void> {
    await this.sendEmail(user, 'password-reset', {
      name: `${user.firstName} ${user.lastName}`,
      link: resetLink,
    });
    await this.createNotification(user.id, NotificationType.PASSWORD_RESET, 'Сброс пароля', 'Запрос на сброс пароля получен', NotificationChannel.EMAIL);
  }

  async sendAccountLocked(user: User): Promise<void> {
    await this.sendEmail(user, 'account-locked', {
      name: `${user.firstName} ${user.lastName}`,
    });
    await this.createNotification(user.id, NotificationType.SYSTEM, 'Аккаунт заблокирован', 'Ваш аккаунт временно заблокирован из-за нескольких неудачных попыток входа', NotificationChannel.EMAIL);
  }

  async sendCancellationNotice(user: User, appointment: { serviceName: string; date: string; time: string }): Promise<void> {
    await this.sendEmail(user, 'cancellation-notice', {
      name: `${user.firstName} ${user.lastName}`,
      service: appointment.serviceName,
      date: appointment.date,
      time: appointment.time,
    });
    await this.createNotification(user.id, NotificationType.APPOINTMENT_CANCELLED, 'Запись отменена', `Ваша запись на ${appointment.serviceName} (${appointment.date} ${appointment.time}) отменена`, NotificationChannel.EMAIL);
  }

  async sendFollowUp(user: User, context: { serviceName: string; daysSinceVisit: number; specialistName?: string }): Promise<void> {
    const specialist = context.specialistName ? ` у ${context.specialistName}` : '';
    await this.sendEmail(user, 'follow-up', {
      name: `${user.firstName} ${user.lastName}`,
      service: context.serviceName,
      days: String(context.daysSinceVisit),
      specialist: context.specialistName ?? '',
    });
    await this.createNotification(
      user.id,
      NotificationType.FOLLOW_UP,
      'Как вы себя чувствуете?',
      `Прошло ${context.daysSinceVisit} дней после процедуры «${context.serviceName}»${specialist}. Надеемся, вы довольны результатом!`,
      NotificationChannel.EMAIL,
    );
  }

  async sendReactivation(user: User, context: { daysSinceLastVisit: number; promoCode?: string }): Promise<void> {
    const promoMsg = context.promoCode ? ` Используйте промокод ${context.promoCode}.` : '';
    await this.sendEmail(user, 'reactivation', {
      name: `${user.firstName} ${user.lastName}`,
      days: String(context.daysSinceLastVisit),
      promoCode: context.promoCode ?? '',
    });
    await this.createNotification(
      user.id,
      NotificationType.REACTIVATION,
      'Мы скучаем по вам!',
      `Вы не посещали нас уже ${context.daysSinceLastVisit} дней. Приходите, мы ждём вас!${promoMsg}`,
      NotificationChannel.EMAIL,
    );
  }

  async sendLoyaltyPointsEarned(user: User, context: { points: number; totalPoints: number; tierName: string }): Promise<void> {
    await this.createNotification(
      user.id,
      NotificationType.LOYALTY_REMINDER,
      `+${context.points} бонусных баллов`,
      `Вы получили ${context.points} баллов. Итого: ${context.totalPoints} баллов (${context.tierName})`,
      NotificationChannel.IN_APP,
    );
  }

  async sendMembershipRenewalReminder(user: User, context: { planName: string; expiresAt: string; daysLeft: number }): Promise<void> {
    await this.sendEmail(user, 'membership-renewal', {
      name: `${user.firstName} ${user.lastName}`,
      plan: context.planName,
      expiresAt: context.expiresAt,
      daysLeft: String(context.daysLeft),
    });
    await this.createNotification(
      user.id,
      NotificationType.MEMBERSHIP_RENEWAL,
      'Абонемент истекает',
      `Ваш абонемент «${context.planName}» истекает ${context.expiresAt} (через ${context.daysLeft} дн.). Продлите сейчас.`,
      NotificationChannel.EMAIL,
    );
  }

  async sendRecurringTreatmentReminder(user: User, context: { serviceName: string; recommendedDate: string }): Promise<void> {
    await this.sendEmail(user, 'recurring-treatment', {
      name: `${user.firstName} ${user.lastName}`,
      service: context.serviceName,
      date: context.recommendedDate,
    });
    await this.createNotification(
      user.id,
      NotificationType.RECURRING_TREATMENT,
      'Пора на процедуру',
      `Рекомендуем записаться на «${context.serviceName}». Рекомендуемая дата: ${context.recommendedDate}`,
      NotificationChannel.EMAIL,
    );
  }

  private async sendEmail(user: User, template: string, variables: Record<string, string>): Promise<void> {
    if (!user.email) return;
    try {
      await this.emailService.sendTemplate(user.email.value, template, variables);
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
