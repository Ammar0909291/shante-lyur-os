import { BaseEntity } from './base.entity';
import { DayOfWeek } from '../enums';

export interface WorkingScheduleProps {
  id: string;
  specialistId: string;
  locationId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkingSchedule extends BaseEntity {
  private _isActive: boolean;

  constructor(private readonly props: WorkingScheduleProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._isActive = props.isActive;
  }

  get specialistId(): string { return this.props.specialistId; }
  get locationId(): string { return this.props.locationId; }
  get dayOfWeek(): DayOfWeek { return this.props.dayOfWeek; }
  get startTime(): string { return this.props.startTime; }
  get endTime(): string { return this.props.endTime; }
  get breakStart(): string | undefined { return this.props.breakStart; }
  get breakEnd(): string | undefined { return this.props.breakEnd; }
  get isActive(): boolean { return this._isActive; }
  get validFrom(): Date { return this.props.validFrom; }
  get validUntil(): Date | undefined { return this.props.validUntil; }

  get startMinutes(): number {
    const [h, m] = this.props.startTime.split(':').map(Number);
    return h * 60 + m;
  }

  get endMinutes(): number {
    const [h, m] = this.props.endTime.split(':').map(Number);
    return h * 60 + m;
  }

  get breakStartMinutes(): number | undefined {
    if (!this.props.breakStart) return undefined;
    const [h, m] = this.props.breakStart.split(':').map(Number);
    return h * 60 + m;
  }

  get breakEndMinutes(): number | undefined {
    if (!this.props.breakEnd) return undefined;
    const [h, m] = this.props.breakEnd.split(':').map(Number);
    return h * 60 + m;
  }

  get totalMinutes(): number {
    return this.endMinutes - this.startMinutes;
  }

  isValidForDate(date: Date): boolean {
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    const from = new Date(this.props.validFrom);
    from.setHours(0, 0, 0, 0);
    if (check < from) return false;
    if (this.props.validUntil) {
      const until = new Date(this.props.validUntil);
      until.setHours(0, 0, 0, 0);
      if (check > until) return false;
    }
    return true;
  }

  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  static reconstitute(props: WorkingScheduleProps): WorkingSchedule {
    return new WorkingSchedule(props);
  }
}