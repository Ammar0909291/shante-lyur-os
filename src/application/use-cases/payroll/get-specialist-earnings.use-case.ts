import { IPayrollRepository } from '../../ports/payroll-repository.port';
import { Specialist } from '../../../domain/entities';
import { NotFoundError } from '../../../domain/errors';

interface ISpecialistLookup {
  findById(id: string): Promise<Specialist | null>;
}

export class GetSpecialistEarningsUseCase {
  constructor(
    private readonly payrollRepo: IPayrollRepository,
    private readonly specialistRepo: ISpecialistLookup,
  ) {}

  async execute(
    specialistId: string,
    options?: { from?: Date; to?: Date; limit?: number; offset?: number },
  ) {
    const specialist = await this.specialistRepo.findById(specialistId);
    if (!specialist) throw new NotFoundError('Specialist', specialistId);

    const [entriesResult, payoutsResult, rule] = await Promise.all([
      this.payrollRepo.findEntriesBySpecialist(specialistId, options),
      this.payrollRepo.findPayoutsBySpecialist(specialistId, { limit: 12 }),
      this.payrollRepo.findCommissionRule(specialistId),
    ]);

    const { items: entries, total: entryTotal } = entriesResult;
    const { items: payouts } = payoutsResult;

    const totalEarned = entries.reduce((sum, e) => sum + e.netCommission, 0);
    const totalPaid = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.totalNet, 0);
    const pendingAmount = payouts
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.totalNet, 0);

    return {
      specialist: {
        id: specialist.id,
        commissionRate: specialist.commissionRate,
        effectiveRate: rule?.isActive ? rule.commissionValue : specialist.commissionRate,
      },
      summary: {
        totalEarned,
        totalPaid,
        pendingAmount,
        entryCount: entryTotal,
      },
      recentEntries: entries.slice(0, 20),
      recentPayouts: payouts,
    };
  }
}
