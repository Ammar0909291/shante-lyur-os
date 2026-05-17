import { BaseEntity } from './base.entity';
import { AuditAction } from '../enums';

export interface AuditLogProps {
  id: string;
  userId?: string;
  appointmentId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class AuditLog extends BaseEntity {
  constructor(private readonly props: AuditLogProps) {
    super(props.id, props.createdAt, props.createdAt);
  }

  get userId(): string | undefined { return this.props.userId; }
  get appointmentId(): string | undefined { return this.props.appointmentId; }
  get action(): AuditAction { return this.props.action; }
  get entityType(): string { return this.props.entityType; }
  get entityId(): string | undefined { return this.props.entityId; }
  get oldValues(): Record<string, unknown> | undefined { return this.props.oldValues; }
  get newValues(): Record<string, unknown> | undefined { return this.props.newValues; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }
  get userAgent(): string | undefined { return this.props.userAgent; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }

  static create(props: Omit<AuditLogProps, 'id' | 'createdAt'>): AuditLog {
    return new AuditLog({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }
}
