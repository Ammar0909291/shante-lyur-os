import { BaseEntity } from './base.entity';
import { NotificationType, NotificationChannel, NotificationStatus } from '../enums';

export interface NotificationProps {
  id: string;
  userId: string;
  appointmentId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  createdAt: Date;
}

export class Notification extends BaseEntity {
  private _status: NotificationStatus;

  constructor(private readonly props: NotificationProps) {
    super(props.id, props.createdAt, props.createdAt);
    this._status = props.status;
  }

  get userId(): string { return this.props.userId; }
  get appointmentId(): string | undefined { return this.props.appointmentId; }
  get type(): NotificationType { return this.props.type; }
  get channel(): NotificationChannel { return this.props.channel; }
  get status(): NotificationStatus { return this._status; }
  get title(): string { return this.props.title; }
  get body(): string { return this.props.body; }
  get data(): Record<string, unknown> | undefined { return this.props.data; }
  get sentAt(): Date | undefined { return this.props.sentAt; }
  get deliveredAt(): Date | undefined { return this.props.deliveredAt; }
  get readAt(): Date | undefined { return this.props.readAt; }
  get error(): string | undefined { return this.props.error; }
  get isRead(): boolean { return this._status === NotificationStatus.READ; }
  get isPending(): boolean { return this._status === NotificationStatus.PENDING; }

  markSent(): void {
    this._status = NotificationStatus.SENT;
    this.props.sentAt = new Date();
    this.updatedAt = new Date();
  }

  markDelivered(): void {
    this._status = NotificationStatus.DELIVERED;
    this.props.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  markRead(): void {
    this._status = NotificationStatus.READ;
    this.props.readAt = new Date();
    this.updatedAt = new Date();
  }

  markFailed(error: string): void {
    this._status = NotificationStatus.FAILED;
    this.props.error = error;
    this.updatedAt = new Date();
  }
}
