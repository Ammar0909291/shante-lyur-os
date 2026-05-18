import { PayrollPeriod, Payout } from '../../domain/entities';
import { PayrollPeriodStatus, PayoutStatus } from '../../domain/enums';

export interface CommissionRuleData {
  id: string;
  specialistId?: string;
  serviceId?: string;
  commissionType: string;
  commissionValue: number;
  isActive: boolean;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollEntryData {
  id: string;
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
  notes?: string;
  createdAt: Date;
}

export interface PayrollAdjustmentData {
  id: string;
  periodId: string;
  specialistId: string;
  type: string;
  amount: number;
  reason: string;
  appliedBy?: string;
  createdAt: Date;
}

export interface PayrollPaymentData {
  paymentId: string;
  appointmentId: string;
  specialistId: string;
  paymentAmount: number;
  specialistCommission: number | null;
  totalRefunded: number;
  status: string;
  paidAt: Date;
}

export interface SpecialistPayrollSummary {
  specialistId: string;
  totalGross: number;
  totalDeductions: number;
  totalAdjustments: number;
  totalNet: number;
  entryCount: number;
}

export interface IPayrollRepository {
  // Commission rules
  findCommissionRule(specialistId: string, serviceId?: string): Promise<CommissionRuleData | null>;
  findCommissionRulesBySpecialist(specialistId: string): Promise<CommissionRuleData[]>;
  createCommissionRule(data: Omit<CommissionRuleData, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommissionRuleData>;
  updateCommissionRule(id: string, data: Partial<Pick<CommissionRuleData, 'commissionType' | 'commissionValue' | 'isActive' | 'notes'>>): Promise<CommissionRuleData>;

  // Payroll periods
  createPeriod(period: PayrollPeriod): Promise<PayrollPeriod>;
  findPeriodById(id: string): Promise<PayrollPeriod | null>;
  findPeriods(options?: { status?: PayrollPeriodStatus; limit?: number; offset?: number }): Promise<{ items: PayrollPeriod[]; total: number }>;
  updatePeriod(period: PayrollPeriod): Promise<PayrollPeriod>;

  // Entries
  createEntriesBulk(entries: Omit<PayrollEntryData, 'id' | 'createdAt'>[]): Promise<void>;
  deleteEntriesByPeriod(periodId: string): Promise<void>;
  findEntriesByPeriod(periodId: string, specialistId?: string): Promise<PayrollEntryData[]>;
  findEntriesBySpecialist(specialistId: string, options?: { from?: Date; to?: Date; limit?: number; offset?: number }): Promise<{ items: PayrollEntryData[]; total: number }>;

  // Adjustments
  createAdjustment(data: Omit<PayrollAdjustmentData, 'id' | 'createdAt'>): Promise<PayrollAdjustmentData>;
  findAdjustmentsByPeriod(periodId: string, specialistId?: string): Promise<PayrollAdjustmentData[]>;

  // Payouts
  upsertPayout(payout: Payout): Promise<Payout>;
  findPayoutsByPeriod(periodId: string): Promise<Payout[]>;
  findPayoutsBySpecialist(specialistId: string, options?: { status?: PayoutStatus; limit?: number; offset?: number }): Promise<{ items: Payout[]; total: number }>;
  findPayoutById(id: string): Promise<Payout | null>;
  updatePayout(payout: Payout): Promise<Payout>;

  // Aggregation for period processing
  getPaymentsForPeriod(startDate: Date, endDate: Date): Promise<PayrollPaymentData[]>;
  getSpecialistSummariesForPeriod(periodId: string): Promise<SpecialistPayrollSummary[]>;
}
