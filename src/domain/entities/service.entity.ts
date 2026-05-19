import { BaseEntity } from './base.entity';
import { ServiceCategory } from '../enums';
import { Money } from '../value-objects/money.vo';

export interface ServiceProps {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  basePrice: Money;
  baseDuration: number; // minutes
  imageUrl?: string;
  isActive: boolean;
  requiresConsultation: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Service extends BaseEntity {
  private _isActive: boolean;
  private _basePrice: Money;

  constructor(private readonly props: ServiceProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._isActive = props.isActive;
    this._basePrice = props.basePrice;
  }

  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get category(): ServiceCategory { return this.props.category; }
  get basePrice(): Money { return this._basePrice; }
  get baseDuration(): number { return this.props.baseDuration; }
  get imageUrl(): string | undefined { return this.props.imageUrl; }
  get isActive(): boolean { return this._isActive; }
  get requiresConsultation(): boolean { return this.props.requiresConsultation; }
  get sortOrder(): number { return this.props.sortOrder; }

  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  updatePrice(newPrice: Money): void {
    this._basePrice = newPrice;
    this.updatedAt = new Date();
  }

  updateDuration(minutes: number): void {
    if (minutes <= 0) throw new Error('Duration must be positive');
    (this.props as ServiceProps).baseDuration = minutes;
    this.updatedAt = new Date();
  }

  static reconstitute(props: ServiceProps): Service {
    return new Service(props);
  }
}