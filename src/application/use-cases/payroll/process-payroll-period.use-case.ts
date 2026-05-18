import { IPayrollRepository } from '../../ports/payroll-repository.port';
import { PayrollPeriodStatus } from '../../../domain/enums';
import { Specialist } from '../../../domain/entities';

interface ISpecialistLookup {
  findById(id: string): Promise<Specialist | null>;
}
import { Payout } from '../../../domain/entities';
import { PayoutStatus } from '../../../domain/enums';
import { NotFoundError, ConflictError } from '../../../domain/errors';

export class ProcessPayrollPeriodUseCase {
  constructor(
    private readonly payrollRepo: IPayrollRepository,
    private readonly specialistRepo: ISpecialistLookup,
  ) {}

  async execute(periodId: string): Promise<{ periodId: string; specialistCount: number; totalNet: number }> {
    const period = await this.payrollRepo.findPeriodById(periodId);
    if (!period) throw new NotFoundError('PayrollPeriod', periodId);
    if (period.status !== PayrollPeriodStatus.OPEN) {
      throw new ConflictError('Only OPEN payroll periods can be processed');
    }

    // Load payments with refund totals for the period date range
    const payments = await this.payrollRepo.getPaymentsForPeriod(period.startDate, period.endDate);

    if (payments.length === 0) {
      return { periodId, specialistCount: 0, totalNet: 0 };
    }

    // Collect unique specialist IDs
    const specialistIds = [...new Set(payments.map((p) => p.specialistId))];

    // Load specialists and commission rules
    const specialistMap = new Map<string, { commissionRate: number }>();
    for (const id of specialistIds) {
      const s = await this.specialistRepo.findById(id);
      if (s) {
        // Check for an active commission rule override for this specialist
        const rule = await this.payrollRepo.findCommissionRule(id);
        const effectiveRate = rule?.isActive
          ? rule.commissionType === 'PERCENTAGE'
            ? rule.commissionValue          // stored as 0-1 fraction for PERCENTAGE
            : null                          // FIXED_AMOUNT handled per-entry
          : s.commissionRate;

        specialistMap.set(id, { commissionRate: effectiveRate ?? s.commissionRate });
      }
    }

    // Build payroll entries from payments
    const entries: Array<{
      periodId: string;
      specialistId: string;
      appointmentId?: string;
      paymentId?: string;
      entryType: string;
      grossAmount: number;
      commissionRate: number;
      grossCommission: number;
      refundDeduction: number;
      netCommission: number;
    }> = [];

    for (const payment of payments) {
      const spec = specialistMap.get(payment.specialistId);
      if (!spec) continue;

      const rate = spec.commissionRate;
      const grossAmount = payment.paymentAmount;

      // Use stored specialistCommission if available; otherwise calculate fresh
      const grossCommission =
        payment.specialistCommission != null
          ? payment.specialistCommission
          : Math.round(grossAmount * rate * 100) / 100;

      // Calculate refund deduction proportionally
      const refundFraction =
        grossAmount > 0 ? Math.min(1, payment.totalRefunded / grossAmount) : 0;
      const refundDeduction = Math.round(grossCommission * refundFraction * 100) / 100;
      const netCommission = Math.max(0, grossCommission - refundDeduction);

      entries.push({
        periodId,
        specialistId: payment.specialistId,
        appointmentId: payment.appointmentId,
        paymentId: payment.paymentId,
        entryType: 'SERVICE',
        grossAmount,
        commissionRate: rate,
        grossCommission,
        refundDeduction,
        netCommission,
      });
    }

    // Replace existing entries for this period (idempotent re-processing)
    await this.payrollRepo.deleteEntriesByPeriod(periodId);
    if (entries.length > 0) {
      await this.payrollRepo.createEntriesBulk(entries);
    }

    // Load any existing adjustments
    const adjustments = await this.payrollRepo.findAdjustmentsByPeriod(periodId);

    // Aggregate per specialist
    const totals = new Map<string, { gross: number; deductions: number; adjustments: number }>();

    for (const e of entries) {
      const current = totals.get(e.specialistId) ?? { gross: 0, deductions: 0, adjustments: 0 };
      current.gross += e.netCommission;
      totals.set(e.specialistId, current);
    }

    for (const adj of adjustments) {
      const current = totals.get(adj.specialistId) ?? { gross: 0, deductions: 0, adjustments: 0 };
      current.adjustments += adj.amount;
      totals.set(adj.specialistId, current);
    }

    // Upsert payout records
    let totalNet = 0;
    for (const [specialistId, t] of totals.entries()) {
      const net = Math.max(0, t.gross + t.adjustments);
      totalNet += net;
      const deductions = t.adjustments < 0 ? Math.abs(t.adjustments) : 0;
      const bonuses = t.adjustments > 0 ? t.adjustments : 0;

      const payout = new Payout({
        id: crypto.randomUUID(),
        periodId,
        specialistId,
        totalGross: t.gross,
        totalDeductions: deductions,
        totalAdjustments: bonuses,
        totalNet: net,
        status: PayoutStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.payrollRepo.upsertPayout(payout);
    }

    return { periodId, specialistCount: totals.size, totalNet };
  }
}
