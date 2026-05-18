import { PrismaClient } from '@prisma/client';
import { IPayrollRepository, CommissionRuleData, PayrollEntryData, PayrollAdjustmentData, PayrollPaymentData, SpecialistPayrollSummary } from '@/application/ports/payroll-repository.port';
import { PayrollPeriod, Payout } from '@/domain/entities';
import { PayrollPeriodStatus, PayoutStatus } from '@/domain/enums';

function toPeriodDomain(raw: {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PayrollPeriod {
  return new PayrollPeriod({
    id: raw.id,
    name: raw.name,
    startDate: raw.startDate,
    endDate: raw.endDate,
    status: raw.status as PayrollPeriodStatus,
    approvedBy: raw.approvedBy ?? undefined,
    approvedAt: raw.approvedAt ?? undefined,
    notes: raw.notes ?? undefined,
    createdBy: raw.createdBy ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

function toPayoutDomain(raw: {
  id: string;
  periodId: string;
  specialistId: string;
  totalGross: unknown;
  totalDeductions: unknown;
  totalAdjustments: unknown;
  totalNet: unknown;
  status: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  notes: string | null;
  processedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Payout {
  return new Payout({
    id: raw.id,
    periodId: raw.periodId,
    specialistId: raw.specialistId,
    totalGross: Number(raw.totalGross),
    totalDeductions: Number(raw.totalDeductions),
    totalAdjustments: Number(raw.totalAdjustments),
    totalNet: Number(raw.totalNet),
    status: raw.status as PayoutStatus,
    paidAt: raw.paidAt ?? undefined,
    paymentMethod: raw.paymentMethod ?? undefined,
    notes: raw.notes ?? undefined,
    processedBy: raw.processedBy ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

function toEntryData(raw: any): PayrollEntryData {
  return {
    id: raw.id,
    periodId: raw.periodId,
    specialistId: raw.specialistId,
    appointmentId: raw.appointmentId ?? undefined,
    paymentId: raw.paymentId ?? undefined,
    entryType: raw.entryType,
    grossAmount: Number(raw.grossAmount),
    commissionRate: Number(raw.commissionRate),
    grossCommission: Number(raw.grossCommission),
    refundDeduction: Number(raw.refundDeduction),
    netCommission: Number(raw.netCommission),
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt,
  };
}

export class PrismaPayrollRepository implements IPayrollRepository {
  constructor(private readonly db: PrismaClient) {}

  // ─── Commission rules ───────────────────────────────────────────────────────

  async findCommissionRule(specialistId: string, serviceId?: string): Promise<CommissionRuleData | null> {
    // Most specific first: specialist + service
    if (serviceId) {
      const specific = await (this.db as any).commissionRule.findFirst({
        where: { specialistId, serviceId, isActive: true },
      });
      if (specific) return this.toRuleData(specific);
    }
    // Specialist-level rule (no service constraint)
    const rule = await (this.db as any).commissionRule.findFirst({
      where: { specialistId, serviceId: null, isActive: true },
    });
    return rule ? this.toRuleData(rule) : null;
  }

  async findCommissionRulesBySpecialist(specialistId: string): Promise<CommissionRuleData[]> {
    const rows = await (this.db as any).commissionRule.findMany({
      where: { specialistId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => this.toRuleData(r));
  }

  async createCommissionRule(data: Omit<CommissionRuleData, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommissionRuleData> {
    const row = await (this.db as any).commissionRule.create({ data });
    return this.toRuleData(row);
  }

  async updateCommissionRule(id: string, data: Partial<Pick<CommissionRuleData, 'commissionType' | 'commissionValue' | 'isActive' | 'notes'>>): Promise<CommissionRuleData> {
    const row = await (this.db as any).commissionRule.update({ where: { id }, data });
    return this.toRuleData(row);
  }

  private toRuleData(raw: any): CommissionRuleData {
    return {
      id: raw.id,
      specialistId: raw.specialistId ?? undefined,
      serviceId: raw.serviceId ?? undefined,
      commissionType: raw.commissionType,
      commissionValue: Number(raw.commissionValue),
      isActive: raw.isActive,
      notes: raw.notes ?? undefined,
      createdBy: raw.createdBy ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  // ─── Payroll periods ─────────────────────────────────────────────────────────

  async createPeriod(period: PayrollPeriod): Promise<PayrollPeriod> {
    const row = await (this.db as any).payrollPeriod.create({
      data: {
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
        notes: period.notes,
        createdBy: period.createdBy,
        createdAt: period.createdAt,
        updatedAt: period.updatedAt,
      },
    });
    return toPeriodDomain(row);
  }

  async findPeriodById(id: string): Promise<PayrollPeriod | null> {
    const row = await (this.db as any).payrollPeriod.findUnique({ where: { id } });
    return row ? toPeriodDomain(row) : null;
  }

  async findPeriods(options?: { status?: PayrollPeriodStatus; limit?: number; offset?: number }): Promise<{ items: PayrollPeriod[]; total: number }> {
    const where = options?.status ? { status: options.status } : {};
    const [rows, total] = await Promise.all([
      (this.db as any).payrollPeriod.findMany({
        where,
        orderBy: { startDate: 'desc' },
        take: options?.limit ?? 20,
        skip: options?.offset ?? 0,
      }),
      (this.db as any).payrollPeriod.count({ where }),
    ]);
    return { items: rows.map(toPeriodDomain), total };
  }

  async updatePeriod(period: PayrollPeriod): Promise<PayrollPeriod> {
    const row = await (this.db as any).payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: period.status,
        approvedBy: period.approvedBy,
        approvedAt: period.approvedAt,
        notes: period.notes,
        updatedAt: period.updatedAt,
      },
    });
    return toPeriodDomain(row);
  }

  // ─── Entries ─────────────────────────────────────────────────────────────────

  async createEntriesBulk(entries: Omit<PayrollEntryData, 'id' | 'createdAt'>[]): Promise<void> {
    await (this.db as any).payrollEntry.createMany({ data: entries });
  }

  async deleteEntriesByPeriod(periodId: string): Promise<void> {
    await (this.db as any).payrollEntry.deleteMany({ where: { periodId } });
  }

  async findEntriesByPeriod(periodId: string, specialistId?: string): Promise<PayrollEntryData[]> {
    const where: any = { periodId };
    if (specialistId) where.specialistId = specialistId;
    const rows = await (this.db as any).payrollEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEntryData);
  }

  async findEntriesBySpecialist(
    specialistId: string,
    options?: { from?: Date; to?: Date; limit?: number; offset?: number },
  ): Promise<{ items: PayrollEntryData[]; total: number }> {
    const where: any = { specialistId };
    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }
    const [rows, total] = await Promise.all([
      (this.db as any).payrollEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      (this.db as any).payrollEntry.count({ where }),
    ]);
    return { items: rows.map(toEntryData), total };
  }

  // ─── Adjustments ─────────────────────────────────────────────────────────────

  async createAdjustment(data: Omit<PayrollAdjustmentData, 'id' | 'createdAt'>): Promise<PayrollAdjustmentData> {
    const row = await (this.db as any).payrollAdjustment.create({ data });
    return {
      id: row.id,
      periodId: row.periodId,
      specialistId: row.specialistId,
      type: row.type,
      amount: Number(row.amount),
      reason: row.reason,
      appliedBy: row.appliedBy ?? undefined,
      createdAt: row.createdAt,
    };
  }

  async findAdjustmentsByPeriod(periodId: string, specialistId?: string): Promise<PayrollAdjustmentData[]> {
    const where: any = { periodId };
    if (specialistId) where.specialistId = specialistId;
    const rows = await (this.db as any).payrollAdjustment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      periodId: r.periodId,
      specialistId: r.specialistId,
      type: r.type,
      amount: Number(r.amount),
      reason: r.reason,
      appliedBy: r.appliedBy ?? undefined,
      createdAt: r.createdAt,
    }));
  }

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  async upsertPayout(payout: Payout): Promise<Payout> {
    const row = await (this.db as any).payout.upsert({
      where: { periodId_specialistId: { periodId: payout.periodId, specialistId: payout.specialistId } },
      create: {
        id: payout.id,
        periodId: payout.periodId,
        specialistId: payout.specialistId,
        totalGross: payout.totalGross,
        totalDeductions: payout.totalDeductions,
        totalAdjustments: payout.totalAdjustments,
        totalNet: payout.totalNet,
        status: payout.status,
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt,
      },
      update: {
        totalGross: payout.totalGross,
        totalDeductions: payout.totalDeductions,
        totalAdjustments: payout.totalAdjustments,
        totalNet: payout.totalNet,
        status: payout.status,
        updatedAt: new Date(),
      },
    });
    return toPayoutDomain(row);
  }

  async findPayoutsByPeriod(periodId: string): Promise<Payout[]> {
    const rows = await (this.db as any).payout.findMany({
      where: { periodId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toPayoutDomain);
  }

  async findPayoutsBySpecialist(
    specialistId: string,
    options?: { status?: PayoutStatus; limit?: number; offset?: number },
  ): Promise<{ items: Payout[]; total: number }> {
    const where: any = {};
    // Allow empty string to fetch all (used in analytics)
    if (specialistId) where.specialistId = specialistId;
    if (options?.status) where.status = options.status;
    const [rows, total] = await Promise.all([
      (this.db as any).payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 20,
        skip: options?.offset ?? 0,
      }),
      (this.db as any).payout.count({ where }),
    ]);
    return { items: rows.map(toPayoutDomain), total };
  }

  async findPayoutById(id: string): Promise<Payout | null> {
    const row = await (this.db as any).payout.findUnique({ where: { id } });
    return row ? toPayoutDomain(row) : null;
  }

  async updatePayout(payout: Payout): Promise<Payout> {
    const row = await (this.db as any).payout.update({
      where: { id: payout.id },
      data: {
        status: payout.status,
        paidAt: payout.paidAt,
        paymentMethod: payout.paymentMethod,
        notes: payout.notes,
        processedBy: payout.processedBy,
        updatedAt: payout.updatedAt,
      },
    });
    return toPayoutDomain(row);
  }

  // ─── Payment aggregation ──────────────────────────────────────────────────────

  async getPaymentsForPeriod(startDate: Date, endDate: Date): Promise<PayrollPaymentData[]> {
    // Fetch CAPTURED + PARTIALLY_REFUNDED payments paid in range, with appointment specialist
    const payments = await (this.db as any).payment.findMany({
      where: {
        paidAt: { gte: startDate, lte: endDate },
        status: { in: ['CAPTURED', 'PARTIALLY_REFUNDED'] },
      },
      select: {
        id: true,
        appointmentId: true,
        amount: true,
        specialistCommission: true,
        status: true,
        paidAt: true,
        appointment: { select: { specialistId: true } },
        refunds: {
          where: { status: 'COMPLETED' },
          select: { amount: true },
        },
      },
    });

    return payments
      .filter((p: any) => p.appointment?.specialistId)
      .map((p: any) => ({
        paymentId: p.id,
        appointmentId: p.appointmentId,
        specialistId: p.appointment.specialistId,
        paymentAmount: Number(p.amount),
        specialistCommission: p.specialistCommission != null ? Number(p.specialistCommission) : null,
        totalRefunded: p.refunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0),
        status: p.status,
        paidAt: p.paidAt,
      }));
  }

  async getSpecialistSummariesForPeriod(periodId: string): Promise<SpecialistPayrollSummary[]> {
    const entries = await (this.db as any).payrollEntry.groupBy({
      by: ['specialistId'],
      where: { periodId },
      _sum: { grossCommission: true, refundDeduction: true, netCommission: true },
      _count: { id: true },
    });

    const adjustments = await (this.db as any).payrollAdjustment.groupBy({
      by: ['specialistId'],
      where: { periodId },
      _sum: { amount: true },
    });

    const adjMap = new Map(
      adjustments.map((a: any) => [a.specialistId, Number(a._sum.amount ?? 0)])
    );

    return entries.map((e: any) => {
      const gross: number = Number(e._sum?.netCommission ?? 0);
      const adjTotal: number = Number(adjMap.get(e.specialistId) ?? 0);
      const rawAdj: number = Number(e._sum?.amount ?? 0);
      return {
        specialistId: e.specialistId as string,
        totalGross: gross,
        totalDeductions: rawAdj < 0 ? Math.abs(rawAdj) : 0,
        totalAdjustments: adjTotal > 0 ? adjTotal : 0,
        totalNet: Math.max(0, gross + adjTotal),
        entryCount: Number(e._count?.id ?? 0),
      };
    });
  }
}
