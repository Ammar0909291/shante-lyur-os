import { IPayrollRepository } from '../../ports/payroll-repository.port';
import { AddPayrollAdjustmentDto } from '../../dto/payroll.dto';
import { NotFoundError, ConflictError } from '../../../domain/errors';

export class AddPayrollAdjustmentUseCase {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute(dto: AddPayrollAdjustmentDto, actorId: string) {
    const period = await this.payrollRepo.findPeriodById(dto.periodId);
    if (!period) throw new NotFoundError('PayrollPeriod', dto.periodId);
    if (!period.isEditable) {
      throw new ConflictError('Adjustments can only be added to OPEN payroll periods');
    }

    const adjustment = await this.payrollRepo.createAdjustment({
      periodId: dto.periodId,
      specialistId: dto.specialistId,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason,
      appliedBy: actorId,
    });

    return adjustment;
  }
}
