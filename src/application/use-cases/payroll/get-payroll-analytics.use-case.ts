import { IPayrollRepository } from '../../ports/payroll-repository.port';
import { PayrollPeriodStatus, PayoutStatus } from '../../../domain/enums';

export class GetPayrollAnalyticsUseCase {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute() {
    const [periodsResult, pendingPayouts] = await Promise.all([
      this.payrollRepo.findPeriods({ limit: 12 }),
      this.payrollRepo.findPayoutsBySpecialist('', { status: PayoutStatus.PENDING, limit: 1000 }),
    ]);

    const { items: periods } = periodsResult;

    const openPeriods = periods.filter((p) => p.status === PayrollPeriodStatus.OPEN);
    const approvedPeriods = periods.filter((p) => p.status === PayrollPeriodStatus.APPROVED);
    const paidPeriods = periods.filter((p) => p.status === PayrollPeriodStatus.PAID);

    const totalPendingPayout = pendingPayouts.items.reduce((sum, p) => sum + p.totalNet, 0);

    // Aggregate per period for trend
    const periodSummaries = await Promise.all(
      periods.slice(0, 6).map(async (period) => {
        const summaries = await this.payrollRepo.getSpecialistSummariesForPeriod(period.id);
        const totalNet = summaries.reduce((sum, s) => sum + s.totalNet, 0);
        const specialistCount = summaries.length;
        return {
          periodId: period.id,
          periodName: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          status: period.status,
          totalNet,
          specialistCount,
        };
      }),
    );

    return {
      overview: {
        openCount: openPeriods.length,
        approvedCount: approvedPeriods.length,
        paidCount: paidPeriods.length,
        totalPendingPayout,
      },
      recentPeriods: periodSummaries,
    };
  }
}
