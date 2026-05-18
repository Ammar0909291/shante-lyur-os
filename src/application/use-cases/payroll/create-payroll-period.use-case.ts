import { IPayrollRepository } from '../../ports/payroll-repository.port';
import { CreatePayrollPeriodDto } from '../../dto/payroll.dto';
import { PayrollPeriod } from '../../../domain/entities';
import { PayrollPeriodStatus } from '../../../domain/enums';

export class CreatePayrollPeriodUseCase {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute(dto: CreatePayrollPeriodDto, createdBy?: string): Promise<PayrollPeriod> {
    const period = new PayrollPeriod({
      id: crypto.randomUUID(),
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: PayrollPeriodStatus.OPEN,
      notes: dto.notes,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.payrollRepo.createPeriod(period);
  }
}
