import {
  ICustomerProfileRepository,
  IClientMembershipRepository,
  IClientPackageRepository,
} from '@/application/ports';

export interface RetentionAnalyticsResult {
  customers: {
    total: number;
    active: number;
    atRisk: number;
    avgLifetimeValue: number;
  };
  tiers: {
    BRONZE: number;
    SILVER: number;
    GOLD: number;
    PLATINUM: number;
  };
  memberships: {
    active: number;
    expiringSoon: number;
  };
  packages: {
    active: number;
  };
  repeatRate: number;
}

export class GetRetentionAnalyticsUseCase {
  constructor(
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly membershipRepo: IClientMembershipRepository,
    private readonly packageRepo: IClientPackageRepository,
  ) {}

  async execute(): Promise<RetentionAnalyticsResult> {
    const [metrics, bronzeResult, silverResult, goldResult, platinumResult, expiringMemberships] =
      await Promise.all([
        this.profileRepo.getRetentionMetrics(),
        this.profileRepo.findMany({ loyaltyTier: 'BRONZE', limit: 1 }),
        this.profileRepo.findMany({ loyaltyTier: 'SILVER', limit: 1 }),
        this.profileRepo.findMany({ loyaltyTier: 'GOLD', limit: 1 }),
        this.profileRepo.findMany({ loyaltyTier: 'PLATINUM', limit: 1 }),
        this.membershipRepo.findExpiringSoon(14),
      ]);

    const repeatRate = metrics.totalCustomers > 0
      ? Math.round((metrics.activeCustomers / metrics.totalCustomers) * 100)
      : 0;

    return {
      customers: {
        total: metrics.totalCustomers,
        active: metrics.activeCustomers,
        atRisk: metrics.atRiskCustomers,
        avgLifetimeValue: metrics.avgLifetimeValue,
      },
      tiers: {
        BRONZE: bronzeResult.total,
        SILVER: silverResult.total,
        GOLD: goldResult.total,
        PLATINUM: platinumResult.total,
      },
      memberships: {
        active: 0,
        expiringSoon: expiringMemberships.length,
      },
      packages: {
        active: 0,
      },
      repeatRate,
    };
  }
}
