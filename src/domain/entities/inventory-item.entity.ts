import { BaseEntity } from './base.entity';
import { InventoryCategory } from '../enums';

export interface InventoryItemProps {
  id: string;
  name: string;
  sku?: string;
  category: InventoryCategory;
  unit: string;
  costPrice: number;
  retailPrice?: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel?: number;
  supplierId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InventoryItem extends BaseEntity {
  private _currentStock: number;

  constructor(private readonly props: InventoryItemProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._currentStock = props.currentStock;
  }

  get name(): string { return this.props.name; }
  get sku(): string | undefined { return this.props.sku; }
  get category(): InventoryCategory { return this.props.category; }
  get unit(): string { return this.props.unit; }
  get costPrice(): number { return this.props.costPrice; }
  get retailPrice(): number | undefined { return this.props.retailPrice; }
  get currentStock(): number { return this._currentStock; }
  get minStockLevel(): number { return this.props.minStockLevel; }
  get maxStockLevel(): number | undefined { return this.props.maxStockLevel; }
  get supplierId(): string | undefined { return this.props.supplierId; }
  get isActive(): boolean { return this.props.isActive; }
  get notes(): string | undefined { return this.props.notes; }

  get isLowStock(): boolean {
    return this._currentStock <= this.props.minStockLevel;
  }

  get isOutOfStock(): boolean {
    return this._currentStock <= 0;
  }

  applyMovement(quantity: number): { stockBefore: number; stockAfter: number } {
    const stockBefore = this._currentStock;
    const stockAfter = stockBefore + quantity;
    if (stockAfter < 0) {
      throw new Error(
        `Insufficient stock: have ${stockBefore} ${this.props.unit}, need ${Math.abs(quantity)}`,
      );
    }
    this._currentStock = stockAfter;
    this.updatedAt = new Date();
    return { stockBefore, stockAfter };
  }
}
