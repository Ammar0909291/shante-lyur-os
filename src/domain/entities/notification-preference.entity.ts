import { BaseEntity } from './base.entity';

export interface NotificationPreferenceProps {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  telegramEnabled: boolean;
  telegramChatId?: string;
  appointmentReminders: boolean;
  followUpMessages: boolean;
  loyaltyUpdates: boolean;
  membershipReminders: boolean;
  marketingMessages: boolean;
  reminderLeadHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationPreference extends BaseEntity {
  constructor(private readonly props: NotificationPreferenceProps) {
    super(props.id, props.createdAt, props.updatedAt);
  }

  static createDefault(userId: string): NotificationPreference {
    const now = new Date();
    return new NotificationPreference({
      id: crypto.randomUUID(),
      userId,
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      telegramEnabled: false,
      appointmentReminders: true,
      followUpMessages: true,
      loyaltyUpdates: true,
      membershipReminders: true,
      marketingMessages: false,
      reminderLeadHours: 24,
      createdAt: now,
      updatedAt: now,
    });
  }

  get userId(): string { return this.props.userId; }
  get emailEnabled(): boolean { return this.props.emailEnabled; }
  get smsEnabled(): boolean { return this.props.smsEnabled; }
  get pushEnabled(): boolean { return this.props.pushEnabled; }
  get telegramEnabled(): boolean { return this.props.telegramEnabled; }
  get telegramChatId(): string | undefined { return this.props.telegramChatId; }
  get appointmentReminders(): boolean { return this.props.appointmentReminders; }
  get followUpMessages(): boolean { return this.props.followUpMessages; }
  get loyaltyUpdates(): boolean { return this.props.loyaltyUpdates; }
  get membershipReminders(): boolean { return this.props.membershipReminders; }
  get marketingMessages(): boolean { return this.props.marketingMessages; }
  get reminderLeadHours(): number { return this.props.reminderLeadHours; }

  update(patch: Partial<Omit<NotificationPreferenceProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): void {
    Object.assign(this.props, patch);
    this.props.updatedAt = new Date();
    this.updatedAt = new Date();
  }
}
