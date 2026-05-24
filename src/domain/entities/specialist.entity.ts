import { BaseEntity } from './base.entity';
import { SpecialistStatus } from '../enums';
import { Color } from '../value-objects/color.vo';
import { Money } from '../value-objects/money.vo';

export interface SpecialistProps {
  id: string;
  userId: string;
  bio?: string;
  specialization?: string;
  experienceYears?: number;
  rating?: number;
  reviewCount: number;
  commissionRate: number;
  status: SpecialistStatus;
  color?: Color;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Specialist extends BaseEntity {
  private _status: SpecialistStatus;
  private _rating?: number;
  private _reviewCount: number;

  constructor(private readonly props: SpecialistProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._status = props.status;
    this._rating = props.rating;
    this._reviewCount = props.reviewCount;
  }

  get userId(): string { return this.props.userId; }
  get bio(): string | undefined { return this.props.bio; }
  get specialization(): string | undefined { return this.props.specialization; }
  get experienceYears(): number | undefined { return this.props.experienceYears; }
  get rating(): number | undefined { return this._rating; }
  get reviewCount(): number { return this._reviewCount; }
  get commissionRate(): number { return this.props.commissionRate; }
  get status(): SpecialistStatus { return this._status; }
  get color(): Color | undefined { return this.props.color; }
  get sortOrder(): number { return this.props.sortOrder; }
  get isActive(): boolean { return this._status === SpecialistStatus.ACTIVE; }

  calculateCommission(totalAmount: Money): Money {
    return totalAmount.multiply(this.commissionRate);
  }

  addReview(rating: number): void {
    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    const total = (this._rating ?? 0) * this._reviewCount + rating;
    this._reviewCount += 1;
    this._rating = total / this._reviewCount;
    this.updatedAt = new Date();
  }

  setOnVacation(): void {
    this._status = SpecialistStatus.ON_VACATION;
    this.updatedAt = new Date();
  }

  setActive(): void {
    this._status = SpecialistStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  setInactive(): void {
    this._status = SpecialistStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  terminate(): void {
    this._status = SpecialistStatus.TERMINATED;
    this.updatedAt = new Date();
  }

  static reconstitute(props: SpecialistProps): Specialist {
    return new Specialist(props);
  }
}
