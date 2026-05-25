import { prisma } from '@/infrastructure/config/prisma-client';

type CommissionType = 'FIXED' | 'PERCENTAGE' | 'BONUS';
type Role = 'SPECIALIST' | 'MANAGER' | 'OTHER';

export interface CommissionResult {
  commissionType: CommissionType;
  commissionBasis: number;
  commissionAmount: number;
}

const MANAGER_DEFAULT_PCT = 5;
const OTHER_DEFAULT_PCT   = 0;

export async function calculateCommission(
  userId: string,
  saleTotal: number,
  roleOnSale: Role,
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

  let type: CommissionType = 'PERCENTAGE';
  let basis: number;

  if (roleOnSale === 'SPECIALIST' && user?.specialist?.commissionRate) {
    // commissionRate is stored as ratio (0.30 = 30%), convert to percentage basis
    basis = Number(user.specialist.commissionRate) * 100;
  } else if (roleOnSale === 'MANAGER') {
    basis = MANAGER_DEFAULT_PCT;
  } else {
    basis = OTHER_DEFAULT_PCT;
  }

  const amount =
    type === 'FIXED'
      ? basis
      : type === 'PERCENTAGE'
        ? Math.round(saleTotal * (basis / 100) * 100) / 100
        : 0;

  return { commissionType: type, commissionBasis: basis, commissionAmount: amount };
}
