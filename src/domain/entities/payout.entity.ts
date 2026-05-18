import { BaseEntity } from './base.entity';
import { PayoutStatus } from '../enums';
import { ConflictError } from '../errors';

export interface PayoutProps {
  id: string;
  periodId: string;
  specialistId: string;
  totalGross: number;
  totalDeductions: number;
  totalAdjustments: number;
  totalNet: number;
  status: PayoutStatus;
  paidAt?: Date;
  paymentMethod?: string;
  notes?: string;
  processedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Payout extends BaseEntity {
  private _status: PayoutStatus;
  private _totalNet: number;

  constructor(private readonly props: PayoutProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._status = props.status;
    this._totalNet = props.totalNet;
  }

  get periodId(): string { return this.props.periodId; }
  get specialistId(): string { return this.props.specialistId; }
  get totalGross(): number { return this.props.totalGross; }
  get totalDeductions(): number { return this.props.totalDeductions; }
  get totalAdjustments(): number { return this.props.totalAdjustments; }
  get totalNet(): number { return this._totalNet; }
  get status(): PayoutStatus { return this._status; }
  get paidAt(): Date | undefined { return this.props.paidAt; }
  get paymentMethod(): string | undefined { return this.props.paymentMethod; }
  get notes(): string | undefined { return this.props.notes; }
  get processedBy(): string | undefined { return this.props.processedBy; }

  markPaid(processedBy: string, paymentMethod?: string): void {
    if (this._status !== PayoutStatus.PENDING) {
      throw new ConflictError('Only PENDING payouts can be marked as paid');
    }
    this._status = PayoutStatus.PAID;
    this.props.paidAt = new Date();
    this.props.processedBy = processedBy;
    if (paymentMethod) this.props.paymentMethod = paymentMethod;
    this.updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === PayoutStatus.PAID) {
      throw new ConflictError('Paid payouts cannot be cancelled');
    }
    this._status = PayoutStatus.CANCELLED;
    this.updatedAt = new Date();
  }
}
