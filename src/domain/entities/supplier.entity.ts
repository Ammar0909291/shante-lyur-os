import { BaseEntity } from './base.entity';

export interface SupplierProps {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Supplier extends BaseEntity {
  constructor(private readonly props: SupplierProps) {
    super(props.id, props.createdAt, props.updatedAt);
  }

  get name(): string { return this.props.name; }
  get contactName(): string | undefined { return this.props.contactName; }
  get phone(): string | undefined { return this.props.phone; }
  get email(): string | undefined { return this.props.email; }
  get website(): string | undefined { return this.props.website; }
  get address(): string | undefined { return this.props.address; }
  get notes(): string | undefined { return this.props.notes; }
  get isActive(): boolean { return this.props.isActive; }
}
