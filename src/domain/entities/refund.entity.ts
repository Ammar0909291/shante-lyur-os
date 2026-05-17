import { BaseEntity } from './base.entity';
import { RefundStatus } from '../enums';
import { Money } from '../value-objects/money.vo';
import { ConflictError } from '../errors';

export interface RefundProps {
  id: string;
  paymentId: string;
  providerRefundId?: string;
  amount: Money;
  reason?: string;
  status: RefundStatus;
  processedAt?: Date;
  processedBy?: string;
  createdAt: Date;
}

export class Refund extends BaseEntity {
  private _status: RefundStatus;

  constructor(private readonly props: RefundProps) {
    super(props.id, props.createdAt, props.createdAt);
    this._status = props.status;
  }

  get paymentId(): string { return this.props.paymentId; }
  get providerRefundId(): string | undefined { return this.props.providerRefundId; }
  get amount(): Money { return this.props.amount; }
  get reason(): string | undefined { return this.props.reason; }
  get status(): RefundStatus { return this._status; }
  get processedAt(): Date | undefined { return this.props.processedAt; }
  get processedBy(): string | undefined { return this.props.processedBy; }

  markProcessing(): void {
    if (this._status !== RefundStatus.PENDING) {
      throw new ConflictError('Refund must be pending to process');
    }
    this._status = RefundStatus.PROCESSING;
    this.updatedAt = new Date();
  }

  markCompleted(providerRefundId: string, processedBy: string): void {
    if (this._status !== RefundStatus.PROCESSING) {
      throw new ConflictError('Refund must be processing to complete');
    }
    this._status = RefundStatus.COMPLETED;
    this.props.providerRefundId = providerRefundId;
    this.props.processedBy = processedBy;
    this.props.processedAt = new Date();
    this.updatedAt = new Date();
  }

  markFailed(): void {
    this._status = RefundStatus.FAILED;
    this.updatedAt = new Date();
  }
}
