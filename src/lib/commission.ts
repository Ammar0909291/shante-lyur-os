import { prisma } from '@/infrastructure/config/prisma-client';

type SaleCommissionType = 'FIXED' | 'PERCENTAGE' | 'BONUS';
type Role = 'SPECIALIST' | 'MANAGER' | 'OTHER';
type ClientType = 'NEW' | 'RETURNING' | 'SUBSCRIPTION';

export type CommissionCategory =
  | 'STANDARD_SALE'
  | 'NEW_CLIENT'
  | 'RETURNING_CLIENT'
  | 'UPSELL'
  | 'REFERRAL'
  | 'TARGET_BONUS'
  | 'QUALITY_BONUS'
  | 'CUSTOM';

export interface CommissionResult {
  commissionType: SaleCommissionType;
  commissionCategory: CommissionCategory;
  commissionBasis: number;
  commissionAmount: number;
}

const MANAGER_DEFAULT_PCT = 5;
const OTHER_DEFAULT_PCT   = 0;

function resolveCategory(clientType: ClientType | null, roleOnSale: Role): CommissionCategory {
  if (roleOnSale !== 'SPECIALIST') return 'STANDARD_SALE';
  if (clientType === 'NEW') return 'NEW_CLIENT';
  if (clientType === 'RETURNING') return 'RETURNING_CLIENT';
  return 'STANDARD_SALE';
}

export async function calculateCommission(
  userId: string,
  saleTotal: number,
  roleOnSale: Role,
  clientType?: ClientType | null,
): Promise<CommissionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      specialist: {
        select: {
          commissionRate: true,
          compensationConfig: { select: { serviceOverrides: true, bonusRules: true } },
        },
      },
    },
  });

  let basis: number;

  if (roleOnSale === 'SPECIALIST' && user?.specialist?.commissionRate) {
    basis = Number(user.specialist.commissionRate) * 100;
  } else if (roleOnSale === 'MANAGER') {
    basis = MANAGER_DEFAULT_PCT;
  } else {
    basis = OTHER_DEFAULT_PCT;
  }

  const amount = Math.round(saleTotal * (basis / 100) * 100) / 100;

  return {
    commissionType: 'PERCENTAGE' as SaleCommissionType,
    commissionCategory: resolveCategory(clientType ?? null, roleOnSale),
    commissionBasis: basis,
    commissionAmount: amount,
  };
}
