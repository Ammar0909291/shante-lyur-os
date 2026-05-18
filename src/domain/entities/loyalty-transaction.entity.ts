import { BaseEntity } from './base.entity';
import { LoyaltyTransactionType } from '../enums';

export interface LoyaltyTransactionProps {
  id: string;
  profileId: string;
  appointmentId?: string;
  type: LoyaltyTransactionType;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdBy?: string;
  createdAt: Date;
}

export class LoyaltyTransaction extends BaseEntity {
  constructor(private readonly props: LoyaltyTransactionProps) {
    super(props.id, props.createdAt, props.createdAt);
  }

  get profileId(): string { return this.props.profileId; }
  get appointmentId(): string | undefined { return this.props.appointmentId; }
  get type(): LoyaltyTransactionType { return this.props.type; }
  get points(): number { return this.props.points; }
  get balanceBefore(): number { return this.props.balanceBefore; }
  get balanceAfter(): number { return this.props.balanceAfter; }
  get description(): string | undefined { return this.props.description; }
  get createdBy(): string | undefined { return this.props.createdBy; }
}
