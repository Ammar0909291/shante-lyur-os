import { BaseEntity } from './base.entity';
import { InventoryMovementType } from '../enums';

export interface InventoryMovementProps {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: number;       // positive = in, negative = out
  stockBefore: number;
  stockAfter: number;
  unitCost?: number;
  referenceType?: string; // 'appointment' | 'payment' | 'manual'
  referenceId?: string;
  notes?: string;
  performedBy?: string;
  createdAt: Date;
}

export class InventoryMovement extends BaseEntity {
  constructor(private readonly props: InventoryMovementProps) {
    super(props.id, props.createdAt, props.createdAt);
  }

  get itemId(): string { return this.props.itemId; }
  get type(): InventoryMovementType { return this.props.type; }
  get quantity(): number { return this.props.quantity; }
  get stockBefore(): number { return this.props.stockBefore; }
  get stockAfter(): number { return this.props.stockAfter; }
  get unitCost(): number | undefined { return this.props.unitCost; }
  get referenceType(): string | undefined { return this.props.referenceType; }
  get referenceId(): string | undefined { return this.props.referenceId; }
  get notes(): string | undefined { return this.props.notes; }
  get performedBy(): string | undefined { return this.props.performedBy; }

  get totalCost(): number | undefined {
    if (this.props.unitCost === undefined) return undefined;
    return Math.abs(this.props.quantity) * this.props.unitCost;
  }
}
