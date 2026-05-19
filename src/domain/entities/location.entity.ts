import { BaseEntity } from './base.entity';

export interface LocationProps {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Location extends BaseEntity {
  private _isActive: boolean;

  constructor(private readonly props: LocationProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._isActive = props.isActive;
  }

  get name(): string { return this.props.name; }
  get address(): string { return this.props.address; }
  get city(): string { return this.props.city; }
  get phone(): string | undefined { return this.props.phone; }
  get email(): string | undefined { return this.props.email; }
  get timezone(): string { return this.props.timezone; }
  get isActive(): boolean { return this._isActive; }
  get sortOrder(): number { return this.props.sortOrder; }

  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  static reconstitute(props: LocationProps): Location {
    return new Location(props);
  }
}