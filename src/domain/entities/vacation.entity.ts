import { BaseEntity } from './base.entity';

export interface VacationProps {
  id: string;
  specialistId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export class Vacation extends BaseEntity {
  private _isApproved: boolean;

  static reconstitute(props: VacationProps): Vacation {
    return new Vacation(props);
  }

  constructor(private readonly props: VacationProps) {
    super(props.id, props.createdAt, props.createdAt);
    this._isApproved = props.isApproved;
  }

  get specialistId(): string { return this.props.specialistId; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get reason(): string | undefined { return this.props.reason; }
  get isApproved(): boolean { return this._isApproved; }
  get approvedBy(): string | undefined { return this.props.approvedBy; }
  get approvedAt(): Date | undefined { return this.props.approvedAt; }

  get durationDays(): number {
    const ms = this.props.endDate.getTime() - this.props.startDate.getTime();
    return Math.round(ms / 86400000) + 1;
  }

  overlaps(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const start = new Date(this.props.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(this.props.endDate);
    end.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
  }

  approve(approvedBy: string): void {
    this._isApproved = true;
    this.props.approvedBy = approvedBy;
    this.props.approvedAt = new Date();
    this.updatedAt = new Date();
  }

  reject(): void {
    this._isApproved = false;
    this.updatedAt = new Date();
  }
}
