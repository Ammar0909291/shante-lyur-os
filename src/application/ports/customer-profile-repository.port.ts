import { CustomerProfile } from '@/domain/entities';

export interface ICustomerProfileRepository {
  findById(id: string): Promise<CustomerProfile | null>;
  findByUserId(userId: string): Promise<CustomerProfile | null>;
  findMany(options: {
    search?: string;
    loyaltyTier?: string;
    minVisits?: number;
    maxChurnRisk?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: CustomerProfile[]; total: number }>;
  create(profile: CustomerProfile): Promise<CustomerProfile>;
  update(profile: CustomerProfile): Promise<CustomerProfile>;
  delete(id: string): Promise<void>;
  recordVisit(userId: string, amount: number): Promise<void>;
  updateChurnRisk(userId: string, score: number): Promise<void>;
  getRetentionMetrics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    atRiskCustomers: number;
    avgLifetimeValue: number;
  }>;
}
