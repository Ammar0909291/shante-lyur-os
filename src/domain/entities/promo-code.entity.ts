import { BaseEntity } from './base.entity';
import { DiscountType } from '../enums';
import { Money } from '../value-objects/money.vo';
import { ValidationError, ConflictError } from '../errors';

export interface PromoCodeProps {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number;
  currentUses: number;
  maxUsesPerUser: number;
  minOrderAmount?: Money;
  validFrom: Date;
  validUntil: Date;
  applicableServices?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PromoCode extends BaseEntity {
  private _isActive: boolean;
  private _currentUses: number;

  static reconstitute(props: PromoCodeProps): PromoCode {
    return new PromoCode(props);
  }

  constructor(private readonly props: PromoCodeProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._isActive = props.isActive;
    this._currentUses = props.currentUses;
  }

  get code(): string { return this.props.code; }
  get description(): string | undefined { return this.props.description; }
  get discountType(): DiscountType { return this.props.discountType; }
  get discountValue(): number { return this.props.discountValue; }
  get maxUses(): number | undefined { return this.props.maxUses; }
  get currentUses(): number { return this._currentUses; }
  get maxUsesPerUser(): number { return this.props.maxUsesPerUser; }
  get minOrderAmount(): Money | undefined { return this.props.minOrderAmount; }
  get validFrom(): Date { return this.props.validFrom; }
  get validUntil(): Date { return this.props.validUntil; }
  get applicableServices(): string[] | undefined { return this.props.applicableServices; }
  get isActive(): boolean { return this._isActive; }
  get createdBy(): string { return this.props.createdBy; }
  get isExpired(): boolean { return new Date() > this.props.validUntil; }
  get isValid(): boolean { return this._isActive && !this.isExpired; }

  calculateDiscount(orderAmount: Money): Money {
    if (!this.isValid) {
      throw new ConflictError('Promo code is not valid');
    }
    if (this.props.minOrderAmount && orderAmount.isGreaterThan(this.props.minOrderAmount)) {
      throw new ValidationError(`Minimum order amount is ${this.props.minOrderAmount}`);
    }

    switch (this.discountType) {
      case DiscountType.PERCENTAGE:
        return orderAmount.percentage(this.discountValue);
      case DiscountType.FIXED_AMOUNT:
        const fixed = Money.create(this.discountValue, orderAmount.currency);
        return orderAmount.isGreaterThan(fixed) ? fixed : orderAmount;
      case DiscountType.FREE_SERVICE:
        return orderAmount;
      default:
        return Money.zero(orderAmount.currency);
    }
  }

  recordUsage(): void {
    if (this.maxUses !== undefined && this._currentUses >= this.maxUses) {
      throw new ConflictError('Promo code usage limit reached');
    }
    this._currentUses += 1;
    this.updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }
}
