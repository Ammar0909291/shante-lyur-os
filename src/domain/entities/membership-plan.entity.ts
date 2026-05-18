import { BaseEntity } from './base.entity';
import { MembershipBillingPeriod } from '../enums';

export interface MembershipPlanProps {
  id: string;
  name: string;
  description?: string;
  billingPeriod: MembershipBillingPeriod;
  billingPrice: number;
  includedSessions?: number;
  discountPercent: number;
  bonusPointsPerPeriod: number;
  applicableServiceIds: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class MembershipPlan extends BaseEntity {
  constructor(private readonly props: MembershipPlanProps) {
    super(props.id, props.createdAt, props.updatedAt);
  }

  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get billingPeriod(): MembershipBillingPeriod { return this.props.billingPeriod; }
  get billingPrice(): number { return this.props.billingPrice; }
  get includedSessions(): number | undefined { return this.props.includedSessions; }
  get discountPercent(): number { return this.props.discountPercent; }
  get bonusPointsPerPeriod(): number { return this.props.bonusPointsPerPeriod; }
  get applicableServiceIds(): string[] { return this.props.applicableServiceIds; }
  get isActive(): boolean { return this.props.isActive; }
  get sortOrder(): number { return this.props.sortOrder; }

  appliesToService(serviceId: string): boolean {
    if (this.props.applicableServiceIds.length === 0) return true;
    return this.props.applicableServiceIds.includes(serviceId);
  }

  nextRenewalDate(from: Date): Date {
    const d = new Date(from);
    switch (this.props.billingPeriod) {
      case MembershipBillingPeriod.MONTHLY:
        d.setMonth(d.getMonth() + 1);
        break;
      case MembershipBillingPeriod.QUARTERLY:
        d.setMonth(d.getMonth() + 3);
        break;
      case MembershipBillingPeriod.ANNUAL:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d;
  }
}
