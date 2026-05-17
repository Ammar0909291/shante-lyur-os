import { BaseEntity } from './base.entity';
import { Money } from '../value-objects/money.vo';

export interface CustomerProfileProps {
  id: string;
  userId: string;
  dateOfBirth?: Date;
  gender?: string;
  skinType?: string;
  hairType?: string;
  bodyType?: string;
  preferredLocationId?: string;
  preferredSpecialistId?: string;
  referralSource?: string;
  firstVisitAt?: Date;
  lastVisitAt?: Date;
  totalVisits: number;
  totalSpent: Money;
  loyaltyPoints: number;
  loyaltyTier: string;
  churnRiskScore?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerProfile extends BaseEntity {
  private _totalVisits: number;
  private _totalSpent: Money;
  private _loyaltyPoints: number;
  private _loyaltyTier: string;
  private _churnRiskScore?: number;

  constructor(private readonly props: CustomerProfileProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._totalVisits = props.totalVisits;
    this._totalSpent = props.totalSpent;
    this._loyaltyPoints = props.loyaltyPoints;
    this._loyaltyTier = props.loyaltyTier;
    this._churnRiskScore = props.churnRiskScore;
  }

  get userId(): string { return this.props.userId; }
  get dateOfBirth(): Date | undefined { return this.props.dateOfBirth; }
  get gender(): string | undefined { return this.props.gender; }
  get skinType(): string | undefined { return this.props.skinType; }
  get hairType(): string | undefined { return this.props.hairType; }
  get bodyType(): string | undefined { return this.props.bodyType; }
  get preferredLocationId(): string | undefined { return this.props.preferredLocationId; }
  get preferredSpecialistId(): string | undefined { return this.props.preferredSpecialistId; }
  get referralSource(): string | undefined { return this.props.referralSource; }
  get firstVisitAt(): Date | undefined { return this.props.firstVisitAt; }
  get lastVisitAt(): Date | undefined { return this.props.lastVisitAt; }
  get totalVisits(): number { return this._totalVisits; }
  get totalSpent(): Money { return this._totalSpent; }
  get loyaltyPoints(): number { return this._loyaltyPoints; }
  get loyaltyTier(): string { return this._loyaltyTier; }
  get churnRiskScore(): number | undefined { return this._churnRiskScore; }
  get notes(): string | undefined { return this.props.notes; }

  recordVisit(amount: Money): void {
    this._totalVisits += 1;
    this._totalSpent = this._totalSpent.add(amount);
    this.props.lastVisitAt = new Date();
    if (!this.props.firstVisitAt) {
      this.props.firstVisitAt = new Date();
    }
    this.recalculateLoyaltyTier();
    this.updatedAt = new Date();
  }

  addLoyaltyPoints(points: number): void {
    this._loyaltyPoints += points;
    this.recalculateLoyaltyTier();
    this.updatedAt = new Date();
  }

  redeemLoyaltyPoints(points: number): void {
    if (points > this._loyaltyPoints) {
      throw new Error('Insufficient loyalty points');
    }
    this._loyaltyPoints -= points;
    this.updatedAt = new Date();
  }

  setChurnRiskScore(score: number): void {
    if (score < 0 || score > 1) {
      throw new Error('Churn risk score must be between 0 and 1');
    }
    this._churnRiskScore = score;
    this.updatedAt = new Date();
  }

  private recalculateLoyaltyTier(): void {
    const spent = this._totalSpent.amount;
    const visits = this._totalVisits;
    if (spent >= 200_000 || visits >= 50) {
      this._loyaltyTier = 'PLATINUM';
    } else if (spent >= 100_000 || visits >= 25) {
      this._loyaltyTier = 'GOLD';
    } else if (spent >= 50_000 || visits >= 10) {
      this._loyaltyTier = 'SILVER';
    } else {
      this._loyaltyTier = 'BRONZE';
    }
  }
}
