import { BaseEntity } from './base.entity';
import { PaymentProvider, PaymentStatus, isTerminalPaymentStatus } from '../enums';
import { Money } from '../value-objects/money.vo';
import { ValidationError, ConflictError } from '../errors';

export interface PaymentProps {
  id: string;
  appointmentId: string;
  provider: PaymentProvider;
  providerPaymentId?: string;
  amount: Money;
  status: PaymentStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  idempotencyKey?: string;
  commissionAmount?: Money;
  specialistCommission?: Money;
  createdAt: Date;
  updatedAt: Date;
}

export class Payment extends BaseEntity {
  private _status: PaymentStatus;
  private _amount: Money;
  private _commissionAmount?: Money;
  private _specialistCommission?: Money;

  constructor(private readonly props: PaymentProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._status = props.status;
    this._amount = props.amount;
    this._commissionAmount = props.commissionAmount;
    this._specialistCommission = props.specialistCommission;
  }

  get appointmentId(): string { return this.props.appointmentId; }
  get provider(): PaymentProvider { return this.props.provider; }
  get providerPaymentId(): string | undefined { return this.props.providerPaymentId; }
  get amount(): Money { return this._amount; }
  get status(): PaymentStatus { return this._status; }
  get description(): string | undefined { return this.props.description; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }
  get paidAt(): Date | undefined { return this.props.paidAt; }
  get failedAt(): Date | undefined { return this.props.failedAt; }
  get failureReason(): string | undefined { return this.props.failureReason; }
  get idempotencyKey(): string | undefined { return this.props.idempotencyKey; }
  get commissionAmount(): Money | undefined { return this._commissionAmount; }
  get specialistCommission(): Money | undefined { return this._specialistCommission; }
  get isTerminal(): boolean { return isTerminalPaymentStatus(this._status); }
  get isSuccessful(): boolean { return this._status === PaymentStatus.CAPTURED; }
  get isRefundable(): boolean {
    return this._status === PaymentStatus.CAPTURED || this._status === PaymentStatus.PARTIALLY_REFUNDED;
  }

  markAuthorized(providerPaymentId: string): void {
    if (this.isTerminal) {
      throw new ConflictError('Payment is already in terminal state');
    }
    this._status = PaymentStatus.AUTHORIZED;
    this.props.providerPaymentId = providerPaymentId;
    this.updatedAt = new Date();
  }

  markCaptured(): void {
    if (this._status !== PaymentStatus.AUTHORIZED && this._status !== PaymentStatus.PROCESSING) {
      throw new ValidationError('Payment must be authorized or processing to capture');
    }
    this._status = PaymentStatus.CAPTURED;
    this.props.paidAt = new Date();
    this.updatedAt = new Date();
  }

  markFailed(reason: string): void {
    if (this.isTerminal) {
      throw new ConflictError('Payment is already in terminal state');
    }
    this._status = PaymentStatus.FAILED;
    this.props.failedAt = new Date();
    this.props.failureReason = reason;
    this.updatedAt = new Date();
  }

  markCancelled(): void {
    if (this.isTerminal) {
      throw new ConflictError('Payment is already in terminal state');
    }
    this._status = PaymentStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  markExpired(): void {
    if (this.isTerminal) {
      throw new ConflictError('Payment is already in terminal state');
    }
    this._status = PaymentStatus.EXPIRED;
    this.updatedAt = new Date();
  }

  applyFullRefund(): void {
    if (!this.isRefundable) {
      throw new ConflictError('Payment is not refundable');
    }
    this._status = PaymentStatus.FULLY_REFUNDED;
    this.updatedAt = new Date();
  }

  applyPartialRefund(refundAmount: Money): void {
    if (!this.isRefundable) {
      throw new ConflictError('Payment is not refundable');
    }
    if (refundAmount.isGreaterThan(this._amount)) {
      throw new ValidationError('Refund amount cannot exceed payment amount');
    }
    this._status = PaymentStatus.PARTIALLY_REFUNDED;
    this.updatedAt = new Date();
  }

  setCommissions(commission: Money, specialistCommission: Money): void {
    this._commissionAmount = commission;
    this._specialistCommission = specialistCommission;
    this.updatedAt = new Date();
  }
}
