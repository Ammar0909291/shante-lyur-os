import { LoyaltyTransaction } from '@/domain/entities';
import { LoyaltyTransactionType } from '@/domain/enums';

export interface ILoyaltyRepository {
  createTransaction(tx: LoyaltyTransaction): Promise<LoyaltyTransaction>;
  findTransactionsByProfile(profileId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ items: LoyaltyTransaction[]; total: number }>;
  addPoints(profileId: string, points: number, type: LoyaltyTransactionType, description?: string, appointmentId?: string, createdBy?: string): Promise<{ newBalance: number; tier: string }>;
  deductPoints(profileId: string, points: number, type: LoyaltyTransactionType, description?: string, appointmentId?: string, createdBy?: string): Promise<{ newBalance: number }>;
  getBalance(profileId: string): Promise<{ points: number; tier: string }>;
  claimReferralReward(referralId: string): Promise<void>;
  getPendingReferralRewards(profileId: string): Promise<Array<{
    referralId: string;
    code: string;
    rewardType: string | null;
    rewardValue: number | null;
  }>>;
}
