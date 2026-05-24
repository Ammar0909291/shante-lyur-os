/**
 * Payroll Engine — commission and compensation calculations.
 *
 * Rules:
 *  - Commission basis is always paidAmount (not totalPrice) so refunds are
 *    automatically reflected without a separate reversal step.
 *  - Service-specific overrides in SpecialistCompensation.serviceOverrides
 *    take precedence over the specialist-level commissionRate.
 *  - Massage workload unit: 90-min massage = 1.5 units; target = 6 units/day.
 */

import { prisma } from '@/infrastructure/config/prisma-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceOverride {
  type:  'pct' | 'fixed'; // pct = percentage of price, fixed = fixed ₽ amount
  value: number;
}

export interface CommissionBreakdown {
  appointmentId:  string;
  date:           Date;
  serviceNames:   string[];
  revenue:        number;   // paidAmount used as commission basis
  commissionRate: number;   // effective rate applied (for pct) or 0 for fixed
  commission:     number;   // computed commission
  isRefunded:     boolean;
}

export interface PayrollCalculation {
  specialistId:    string;
  specialistName:  string;
  periodStart:     Date;
  periodEnd:       Date;
  compensationType: string;
  baseSalary:      number;
  totalCommission: number;
  totalBonuses:    number;
  totalPenalties:  number;
  totalDeductions: number;
  netPayable:      number;
  completedApts:   number;
  totalRevenue:    number;
  totalRefunded:   number;
  workingDays:     number;
  workedHours:     number;
  breakdown:       CommissionBreakdown[];
  workloadScore:   number;
  burnoutRisk:     'LOW' | 'MEDIUM' | 'HIGH';
}

// ─── Commission per appointment ────────────────────────────────────────────────

function computeCommission(
  appointment: {
    id: string;
    startAt: Date;
    paidAmount: number;
    services: { serviceId: string; serviceName: string; price: number }[];
  },
  commissionRate: number,           // specialist base rate (0–1)
  serviceOverrides: Record<string, ServiceOverride>,
): CommissionBreakdown {
  let totalCommission = 0;
  const serviceNames: string[] = [];

  for (const svc of appointment.services) {
    serviceNames.push(svc.serviceName);
    const override = serviceOverrides[svc.serviceId];

    if (override) {
      if (override.type === 'fixed') {
        totalCommission += override.value;
      } else {
        // pct override: apply to this service's share of paidAmount
        const share = appointment.paidAmount > 0
          ? (svc.price / appointment.services.reduce((s, v) => s + v.price, 0)) * appointment.paidAmount
          : 0;
        totalCommission += share * override.value;
      }
    } else {
      // No service override: proportional share of paidAmount × base rate
      const total = appointment.services.reduce((s, v) => s + v.price, 0);
      const share = total > 0
        ? (svc.price / total) * appointment.paidAmount
        : appointment.paidAmount / appointment.services.length;
      totalCommission += share * commissionRate;
    }
  }

  if (appointment.services.length === 0) {
    // No service breakdown: apply rate directly to paidAmount
    totalCommission = appointment.paidAmount * commissionRate;
  }

  return {
    appointmentId:  appointment.id,
    date:           appointment.startAt,
    serviceNames,
    revenue:        appointment.paidAmount,
    commissionRate,
    commission:     Math.round(totalCommission * 100) / 100,
    isRefunded:     appointment.paidAmount <= 0,
  };
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export async function calculatePayroll(
  specialistId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<PayrollCalculation> {
  const [specialist, compensation, attendance, refunds] = await Promise.all([
    prisma.specialist.findUnique({
      where: { id: specialistId },
      select: {
        id: true,
        commissionRate: true,
        user: { select: { firstName: true, lastName: true } },
        appointments: {
          where: {
            status: 'COMPLETED',
            checkedOutAt: { gte: periodStart, lte: periodEnd },
          },
          select: {
            id: true, startAt: true, totalPrice: true, paidAmount: true, totalDuration: true,
            services: {
              select: {
                serviceId: true,
                price: true,
                service: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.specialistCompensation.findUnique({
      where: { specialistId },
    }),
    prisma.attendanceRecord.findMany({
      where: { specialistId, date: { gte: periodStart, lte: periodEnd } },
      select: { status: true, checkInAt: true, checkOutAt: true, breakMinutes: true },
    }),
    // Refunds linked to this specialist's appointments in period
    prisma.refund.findMany({
      where: {
        status: 'COMPLETED',
        processedAt: { gte: periodStart, lte: periodEnd },
        payment: {
          appointment: {
            specialistId,
            checkedOutAt: { gte: periodStart, lte: periodEnd },
          },
        },
      },
      select: { amount: true },
    }),
  ]);

  if (!specialist) throw new Error(`Specialist ${specialistId} not found`);

  const compType    = (compensation?.type ?? 'COMMISSION_ONLY') as string;
  const baseSalary  = Number(compensation?.baseSalary ?? 0);
  const hourlyRate  = Number(compensation?.hourlyRate ?? 0);
  const baseRate    = Number(specialist.commissionRate);
  const overrides   = (compensation?.serviceOverrides ?? {}) as unknown as Record<string, ServiceOverride>;

  // ── Commission breakdown per appointment ───────────────────────────────────
  const breakdown: CommissionBreakdown[] = [];
  let totalRevenue = 0;

  for (const apt of specialist.appointments) {
    const paidAmount = Number(apt.paidAmount);
    totalRevenue += Number(apt.totalPrice);

    const svcMapped = apt.services.map((s) => ({
      serviceId:   s.serviceId,
      serviceName: s.service.name,
      price:       Number(s.price),
    }));

    const b = computeCommission(
      { id: apt.id, startAt: apt.startAt, paidAmount, services: svcMapped },
      baseRate,
      overrides,
    );
    breakdown.push(b);
  }

  const totalCommissionRaw = breakdown.reduce((s, b) => s + b.commission, 0);

  // ── Salary by type ────────────────────────────────────────────────────────
  let salaryComponent = 0;
  let commissionComponent = 0;

  switch (compType) {
    case 'FIXED_SALARY':
      salaryComponent = baseSalary;
      commissionComponent = 0;
      break;
    case 'COMMISSION_ONLY':
      salaryComponent = 0;
      commissionComponent = totalCommissionRaw;
      break;
    case 'SALARY_PLUS_COMMISSION':
      salaryComponent = baseSalary;
      commissionComponent = totalCommissionRaw;
      break;
    case 'HOURLY': {
      const worked = attendance.reduce((s, a) => {
        if (!a.checkInAt || !a.checkOutAt) return s;
        const hrs = (a.checkOutAt.getTime() - a.checkInAt.getTime()) / 3_600_000 - a.breakMinutes / 60;
        return s + Math.max(0, hrs);
      }, 0);
      salaryComponent = worked * hourlyRate;
      commissionComponent = 0;
      break;
    }
    case 'PROCEDURE_BASED':
      salaryComponent = specialist.appointments.length * Number(compensation?.procedureRate ?? 0);
      commissionComponent = 0;
      break;
    default:
      commissionComponent = totalCommissionRaw;
  }

  // ── Attendance summary ─────────────────────────────────────────────────────
  const presentDays  = attendance.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
  const workedHours  = attendance.reduce((s, a) => {
    if (!a.checkInAt || !a.checkOutAt) return s;
    const h = (a.checkOutAt.getTime() - a.checkInAt.getTime()) / 3_600_000 - a.breakMinutes / 60;
    return s + Math.max(0, h);
  }, 0);

  // ── Workload (massage-style: 90 min = 1.5 units, target = 6/day) ─────────
  const totalDurationMin = specialist.appointments.reduce((s, a) => s + (a.totalDuration ?? 0), 0);
  const workloadUnits    = totalDurationMin / 60; // hours of productive work
  const workingDaysCnt   = Math.max(presentDays, 1);
  const dailyWorkload    = workloadUnits / workingDaysCnt;
  const burnoutRisk: 'LOW' | 'MEDIUM' | 'HIGH' =
    dailyWorkload > 8 ? 'HIGH' : dailyWorkload > 6 ? 'MEDIUM' : 'LOW';
  const workloadScore = Math.min(100, Math.round((dailyWorkload / 6) * 100)); // 100 = target met

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalRefunded  = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const net            = salaryComponent + commissionComponent;

  const r2 = (n: number) => Math.round(n * 100) / 100;

  return {
    specialistId,
    specialistName: `${specialist.user.firstName} ${specialist.user.lastName}`,
    periodStart,
    periodEnd,
    compensationType: compType,
    baseSalary:      r2(salaryComponent),
    totalCommission: r2(commissionComponent),
    totalBonuses:    0,
    totalPenalties:  0,
    totalDeductions: 0,
    netPayable:      r2(net),
    completedApts:   specialist.appointments.length,
    totalRevenue:    r2(totalRevenue),
    totalRefunded:   r2(totalRefunded),
    workingDays:     workingDaysCnt,
    workedHours:     r2(workedHours),
    breakdown,
    workloadScore,
    burnoutRisk,
  };
}
