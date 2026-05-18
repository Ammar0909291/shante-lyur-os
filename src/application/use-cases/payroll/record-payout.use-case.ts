import { IPayrollRepository } from '../../ports/payroll-repository.port';
import { RecordPayoutDto } from '../../dto/payroll.dto';
import { NotFoundError } from '../../../domain/errors';

export class RecordPayoutUseCase {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute(dto: RecordPayoutDto, actorId: string) {
    const payout = await this.payrollRepo.findPayoutById(dto.payoutId);
    if (!payout) throw new NotFoundError('Payout', dto.payoutId);

    payout.markPaid(actorId, dto.paymentMethod);
    if (dto.notes) (payout as any).props.notes = dto.notes;

    const updated = await this.payrollRepo.updatePayout(payout);

    // If all payouts for the period are paid, mark the period as PAID
    const allPayouts = await this.payrollRepo.findPayoutsByPeriod(payout.periodId);
    const allPaid = allPayouts.every((p) => p.status === 'PAID' || p.status === 'CANCELLED');
    if (allPaid) {
      const period = await this.payrollRepo.findPeriodById(payout.periodId);
      if (period && period.status === 'APPROVED') {
        period.markPaid();
        await this.payrollRepo.updatePeriod(period);
      }
    }

    return updated;
  }
}
