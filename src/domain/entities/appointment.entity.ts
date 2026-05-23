import { BaseEntity } from './base.entity';
import { AppointmentStatus, CancellationReason, canTransitionStatus } from '../enums';
import { DateRange } from '../value-objects/date-range.vo';
import { Money } from '../value-objects/money.vo';
import { ValidationError, ConflictError } from '../errors';

export interface AppointmentServiceItem {
  serviceId: string;
  name: string;
  price: Money;
  duration: number;
  sortOrder: number;
}

export interface AppointmentProps {
  id: string;
  clientId: string;
  specialistId: string;
  locationId: string;
  timeSlot: DateRange;
  status: AppointmentStatus;
  services: AppointmentServiceItem[];
  totalPrice: Money;
  totalDuration: number;
  notes?: string;
  cancellationReason?: CancellationReason;
  cancelledAt?: Date;
  cancelledBy?: string;
  noShowAt?: Date;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Appointment extends BaseEntity {
  private _status: AppointmentStatus;
  private _timeSlot: DateRange;
  private _services: AppointmentServiceItem[];
  private _totalPrice: Money;

  static reconstitute(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  constructor(private readonly props: AppointmentProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._status = props.status;
    this._timeSlot = props.timeSlot;
    this._services = [...props.services];
    this._totalPrice = props.totalPrice;
  }

  get clientId(): string { return this.props.clientId; }
  get specialistId(): string { return this.props.specialistId; }
  get locationId(): string { return this.props.locationId; }
  get timeSlot(): DateRange { return this._timeSlot; }
  get startAt(): Date { return this._timeSlot.start; }
  get endAt(): Date { return this._timeSlot.end; }
  get status(): AppointmentStatus { return this._status; }
  get services(): AppointmentServiceItem[] { return [...this._services]; }
  get totalPrice(): Money { return this._totalPrice; }
  get totalDuration(): number { return this.props.totalDuration; }
  get notes(): string | undefined { return this.props.notes; }
  get cancellationReason(): CancellationReason | undefined { return this.props.cancellationReason; }
  get cancelledAt(): Date | undefined { return this.props.cancelledAt; }
  get cancelledBy(): string | undefined { return this.props.cancelledBy; }
  get noShowAt(): Date | undefined { return this.props.noShowAt; }
  get checkedInAt(): Date | undefined { return this.props.checkedInAt; }
  get checkedOutAt(): Date | undefined { return this.props.checkedOutAt; }
  get source(): string | undefined { return this.props.source; }
  get isPending(): boolean { return this._status === AppointmentStatus.PENDING; }
  get isConfirmed(): boolean { return this._status === AppointmentStatus.CONFIRMED; }
  get isCompleted(): boolean { return this._status === AppointmentStatus.COMPLETED; }
  get isCancelled(): boolean { return this._status === AppointmentStatus.CANCELLED; }
  get isNoShow(): boolean { return this._status === AppointmentStatus.NO_SHOW; }
  get isModifiable(): boolean {
    return [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED].includes(this._status);
  }

  private transitionTo(newStatus: AppointmentStatus, actorId: string): void {
    if (!canTransitionStatus(this._status, newStatus)) {
      throw new ValidationError(
        `Invalid status transition: ${this._status} → ${newStatus}`,
        { status: [`Cannot transition from ${this._status} to ${newStatus}`] }
      );
    }
    this._status = newStatus;
    this.updatedAt = new Date();
  }

  confirm(confirmedBy: string): void {
    this.transitionTo(AppointmentStatus.CONFIRMED, confirmedBy);
  }

  startInProgress(actorId: string): void {
    this.transitionTo(AppointmentStatus.IN_PROGRESS, actorId);
    this.props.checkedInAt = new Date();
  }

  complete(actorId: string): void {
    this.transitionTo(AppointmentStatus.COMPLETED, actorId);
    this.props.checkedOutAt = new Date();
  }

  cancel(reason: CancellationReason, cancelledBy: string): void {
    if (!this.isModifiable) {
      throw new ConflictError('Cannot cancel appointment in current status', 'status');
    }
    this.transitionTo(AppointmentStatus.CANCELLED, cancelledBy);
    this.props.cancellationReason = reason;
    this.props.cancelledAt = new Date();
    this.props.cancelledBy = cancelledBy;
  }

  markNoShow(actorId: string): void {
    if (this._status !== AppointmentStatus.IN_PROGRESS) {
      throw new ValidationError('Can only mark no-show from IN_PROGRESS');
    }
    this.transitionTo(AppointmentStatus.NO_SHOW, actorId);
    this.props.noShowAt = new Date();
  }

  reschedule(newTimeSlot: DateRange, rescheduledBy: string): void {
    if (!this.isModifiable) {
      throw new ConflictError('Cannot reschedule appointment in current status', 'status');
    }
    const oldSlot = this._timeSlot;
    this._timeSlot = newTimeSlot;
    this.transitionTo(AppointmentStatus.RESCHEDULED, rescheduledBy);
    // After rescheduling, it should be confirmed again
    this._status = AppointmentStatus.CONFIRMED;
  }

  addService(service: AppointmentServiceItem): void {
    if (!this.isModifiable) {
      throw new ConflictError('Cannot modify services after appointment is in progress');
    }
    this._services.push(service);
    this.recalculateTotals();
  }

  removeService(serviceId: string): void {
    if (!this.isModifiable) {
      throw new ConflictError('Cannot modify services after appointment is in progress');
    }
    const idx = this._services.findIndex(s => s.serviceId === serviceId);
    if (idx === -1) return;
    this._services.splice(idx, 1);
    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    this._totalPrice = this._services.reduce(
      (sum, s) => sum.add(s.price),
      Money.zero(this._totalPrice.currency)
    );
    (this.props as AppointmentProps).totalDuration = this._services.reduce(
      (sum, s) => sum + s.duration, 0
    );
    this.updatedAt = new Date();
  }

  overlaps(other: Appointment): boolean {
    if (this.specialistId !== other.specialistId) return false;
    return this._timeSlot.overlaps(other.timeSlot);
  }
}
