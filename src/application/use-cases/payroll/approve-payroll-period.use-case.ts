import { IPayrollRepository } from '../../ports/payroll-repository.port';
import { NotFoundError } from '../../../domain/errors';

export class ApprovePayrollPeriodUseCase {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute(periodId: string, actorId: string, notes?: string): Promise<void> {
    const period = await this.payrollRepo.findPeriodById(periodId);
    if (!period) throw new NotFoundError('PayrollPeriod', periodId);

    period.approve(actorId);
    if (notes) (period as any).props.notes = notes;

    await this.payrollRepo.updatePeriod(period);
  }
}
