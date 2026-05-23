// Shared types and helpers for the Clients module

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface Client {
  id: string;
  displayId: string;
  name: string;
  email: string;
  phone?: string;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt?: string;
  firstVisitAt?: string;
  churnRiskScore?: number;
  notes?: string;
  tags?: string[];
  referralSource?: string;
  gender?: string;
  dateOfBirth?: string;
  createdAt: string;
}

export function getTierRank(tier: LoyaltyTier): number {
  return { BRONZE: 0, SILVER: 1, GOLD: 2, DIAMOND: 3 }[tier] ?? 0;
}

export function getTierLabel(tier: LoyaltyTier): string {
  return { BRONZE: 'Бронза', SILVER: 'Серебро', GOLD: 'Золото', DIAMOND: 'Бриллиант' }[tier] ?? tier;
}

export function getTierBadgeVariant(tier: LoyaltyTier): 'bronze' | 'silver' | 'gold' | 'platinum' {
  return ({ BRONZE: 'bronze', SILVER: 'silver', GOLD: 'gold', DIAMOND: 'platinum' } as const)[tier];
}

export function normalizeTier(raw: string): LoyaltyTier {
  if (raw === 'PLATINUM') return 'DIAMOND';
  if (['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'].includes(raw)) return raw as LoyaltyTier;
  return 'BRONZE';
}
