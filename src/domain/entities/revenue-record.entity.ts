import { BaseEntity } from './base.entity';
import { RevenueType } from '../enums';
import { Money } from '../value-objects/money.vo';

export interface RevenueRecordProps {
  id: string;
  date: Date;
  type: RevenueType;
  amount: Money;
  specialistId?: string;
  serviceId?: string;
  paymentId?: string;
  appointmentId?: string;
  locationId?: string;
  notes?: string;
  createdAt: Date;
}

export class RevenueRecord extends BaseEntity {
  constructor(private readonly props: RevenueRecordProps) {
    super(props.id, props.createdAt, props.createdAt);
  }

  get date(): Date { return this.props.date; }
  get type(): RevenueType { return this.props.type; }
  get amount(): Money { return this.props.amount; }
  get specialistId(): string | undefined { return this.props.specialistId; }
  get serviceId(): string | undefined { return this.props.serviceId; }
  get paymentId(): string | undefined { return this.props.paymentId; }
  get appointmentId(): string | undefined { return this.props.appointmentId; }
  get locationId(): string | undefined { return this.props.locationId; }
  get notes(): string | undefined { return this.props.notes; }

  static reconstitute(props: RevenueRecordProps): RevenueRecord {
    return new RevenueRecord(props);
  }
}
