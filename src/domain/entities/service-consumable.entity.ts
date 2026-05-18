import { BaseEntity } from './base.entity';

export interface ServiceConsumableProps {
  id: string;
  serviceId: string;
  itemId: string;
  quantityPerUse: number;
  isOptional: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ServiceConsumable extends BaseEntity {
  constructor(private readonly props: ServiceConsumableProps) {
    super(props.id, props.createdAt, props.updatedAt);
  }

  get serviceId(): string { return this.props.serviceId; }
  get itemId(): string { return this.props.itemId; }
  get quantityPerUse(): number { return this.props.quantityPerUse; }
  get isOptional(): boolean { return this.props.isOptional; }
  get notes(): string | undefined { return this.props.notes; }
}
