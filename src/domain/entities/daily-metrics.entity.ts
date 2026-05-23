import { BaseEntity } from './base.entity';
import { Money } from '../value-objects/money.vo';

export interface DailyMetricsProps {
  id: string;
  date: Date;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: Money;
  totalRefunds: Money;
  newCustomers: number;
  returningCustomers: number;
  avgAppointmentValue?: Money;
  avgBookingLeadTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DailyMetrics extends BaseEntity {
  static reconstitute(props: DailyMetricsProps): DailyMetrics {
    return new DailyMetrics(props);
  }

  constructor(private readonly props: DailyMetricsProps) {
    super(props.id, props.createdAt, props.updatedAt);
  }

  get date(): Date { return this.props.date; }
  get totalAppointments(): number { return this.props.totalAppointments; }
  get completedAppointments(): number { return this.props.completedAppointments; }
  get cancelledAppointments(): number { return this.props.cancelledAppointments; }
  get noShowAppointments(): number { return this.props.noShowAppointments; }
  get totalRevenue(): Money { return this.props.totalRevenue; }
  get totalRefunds(): Money { return this.props.totalRefunds; }
  get newCustomers(): number { return this.props.newCustomers; }
  get returningCustomers(): number { return this.props.returningCustomers; }
  get avgAppointmentValue(): Money | undefined { return this.props.avgAppointmentValue; }
  get avgBookingLeadTime(): number | undefined { return this.props.avgBookingLeadTime; }
  get netRevenue(): Money {
    return this.props.totalRevenue.subtract(this.props.totalRefunds);
  }
  get completionRate(): number {
    if (this.props.totalAppointments === 0) return 0;
    return this.props.completedAppointments / this.props.totalAppointments;
  }
  get noShowRate(): number {
    if (this.props.totalAppointments === 0) return 0;
    return this.props.noShowAppointments / this.props.totalAppointments;
  }
}
