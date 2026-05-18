import { BaseEntity } from './base.entity';
import { PayrollPeriodStatus } from '../enums';
import { ConflictError } from '../errors';

export interface PayrollPeriodProps {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: PayrollPeriodStatus;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PayrollPeriod extends BaseEntity {
  private _status: PayrollPeriodStatus;

  constructor(private readonly props: PayrollPeriodProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._status = props.status;
  }

  get name(): string { return this.props.name; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get status(): PayrollPeriodStatus { return this._status; }
  get approvedBy(): string | undefined { return this.props.approvedBy; }
  get approvedAt(): Date | undefined { return this.props.approvedAt; }
  get notes(): string | undefined { return this.props.notes; }
  get createdBy(): string | undefined { return this.props.createdBy; }
  get isEditable(): boolean { return this._status === PayrollPeriodStatus.OPEN; }

  approve(actorId: string): void {
    if (this._status !== PayrollPeriodStatus.OPEN) {
      throw new ConflictError('Only OPEN periods can be approved');
    }
    this._status = PayrollPeriodStatus.APPROVED;
    this.props.approvedBy = actorId;
    this.props.approvedAt = new Date();
    this.updatedAt = new Date();
  }

  markPaid(): void {
    if (this._status !== PayrollPeriodStatus.APPROVED) {
      throw new ConflictError('Only APPROVED periods can be marked as paid');
    }
    this._status = PayrollPeriodStatus.PAID;
    this.updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === PayrollPeriodStatus.PAID) {
      throw new ConflictError('Paid periods cannot be cancelled');
    }
    this._status = PayrollPeriodStatus.CANCELLED;
    this.updatedAt = new Date();
  }
}
