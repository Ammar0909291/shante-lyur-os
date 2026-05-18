import { User } from '@/domain/entities/user.entity';

export interface NotificationServicePort {
  sendBookingConfirmation(user: User, appointment: { serviceName: string; specialistName: string; date: string; time: string }): Promise<void>;
  sendBookingReminder(user: User, appointment: { serviceName: string; date: string; time: string }): Promise<void>;
  sendPaymentReceipt(user: User, payment: { amount: string; currency: string; serviceName: string; date: string }): Promise<void>;
  sendWelcome(user: User): Promise<void>;
  sendPasswordReset(user: User, resetLink: string): Promise<void>;
  sendAccountLocked(user: User): Promise<void>;
  sendCancellationNotice(user: User, appointment: { serviceName: string; date: string; time: string }): Promise<void>;
  sendFollowUp(user: User, context: { serviceName: string; daysSinceVisit: number; specialistName?: string }): Promise<void>;
  sendReactivation(user: User, context: { daysSinceLastVisit: number; promoCode?: string }): Promise<void>;
  sendLoyaltyPointsEarned(user: User, context: { points: number; totalPoints: number; tierName: string }): Promise<void>;
  sendMembershipRenewalReminder(user: User, context: { planName: string; expiresAt: string; daysLeft: number }): Promise<void>;
  sendRecurringTreatmentReminder(user: User, context: { serviceName: string; recommendedDate: string }): Promise<void>;
}
