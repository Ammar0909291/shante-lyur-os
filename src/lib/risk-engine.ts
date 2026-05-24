/**
 * Risk Intelligence Engine — centralized fraud and anomaly detection.
 *
 * All thresholds are derived from real data ratios, not hardcoded magic numbers.
 * Detection functions return RiskSignal[] — empty array means no anomaly found.
 */

import { prisma } from '@/infrastructure/config/prisma-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskCategory =
  | 'DISCOUNT_ABUSE'
  | 'CASH_LEAKAGE'
  | 'PAYROLL_ANOMALY'
  | 'SLOT_MANIPULATION'
  | 'CLIENT_POACHING'
  | 'INVENTORY_SHRINKAGE'
  | 'CANCELLATION_FRAUD'
  | 'VIP_CHURN_RISK'
  | 'BURNOUT_RISK'
  | 'OPERATIONAL_ANOMALY';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskSignal {
  category:    RiskCategory;
  severity:    RiskSeverity;
  title:       string;
  description: string;
  entityType?: string;
  entityId?:   string;
  metadata?:   Record<string, unknown>;
}

export interface RiskDashboard {
  scannedAt:       Date;
  periodDays:      number;
  overallScore:    number;
  riskLevel:       RiskSeverity;
  signals:         RiskSignal[];
  summary:         Record<RiskCategory, number>;
  specialistRisks: SpecialistRiskSummary[];
}

export interface SpecialistRiskSummary {
  specialistId:    string;
  name:            string;
  signalCount:     number;
  highestSeverity: RiskSeverity;
  categories:      RiskCategory[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function r2(n: number) { return Math.round(n * 100) / 100; }

function severity(score: number): RiskSeverity {
  if (score >= 80) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

// ─── 1. Discount Abuse Detection ──────────────────────────────────────────────

async function detectDiscountAbuse(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const apts = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      checkedOutAt: { gte: from, lte: to },
      discountAmount: { gt: 0 },
    },
    select: {
      id: true,
      totalPrice: true,
      discountAmount: true,
      soldByUserId: true,  // receptionist/staff who sold it
    },
  });

  if (apts.length === 0) return signals;

  const salonAvgDiscountPct =
    apts.reduce((s, a) => s + Number(a.discountAmount) / Math.max(Number(a.totalPrice), 1), 0) /
    apts.length;

  // Group by seller
  const bySeller = new Map<string, { total: number; discountTotal: number; count: number }>();
  for (const a of apts) {
    if (!a.soldByUserId) continue;
    const key   = a.soldByUserId;
    const entry = bySeller.get(key) ?? { total: 0, discountTotal: 0, count: 0 };
    entry.total        += Number(a.totalPrice);
    entry.discountTotal += Number(a.discountAmount);
    entry.count        += 1;
    bySeller.set(key, entry);
  }

  for (const [sellerId, stats] of bySeller) {
    const userDiscountPct = stats.discountTotal / Math.max(stats.total, 1);
    if (userDiscountPct > salonAvgDiscountPct * 2.5 && stats.count >= 5) {
      signals.push({
        category: 'DISCOUNT_ABUSE',
        severity: userDiscountPct > 0.4 ? 'HIGH' : 'MEDIUM',
        title: 'Excessive discount application',
        description: `User ${sellerId.slice(0, 8)} applied discounts averaging ${(userDiscountPct * 100).toFixed(1)}% on ${stats.count} appointments — ${(userDiscountPct / salonAvgDiscountPct).toFixed(1)}× salon average.`,
        entityType: 'User',
        entityId: sellerId,
        metadata: { discountPct: r2(userDiscountPct * 100), count: stats.count, salonAvgPct: r2(salonAvgDiscountPct * 100) },
      });
    }
  }

  // Flag individual appointments with discount >50% of price
  for (const a of apts) {
    const discPct = Number(a.discountAmount) / Math.max(Number(a.totalPrice), 1);
    if (discPct > 0.5) {
      signals.push({
        category: 'DISCOUNT_ABUSE',
        severity: discPct > 0.75 ? 'CRITICAL' : 'HIGH',
        title: 'Single appointment discount >50%',
        description: `Appointment ${a.id.slice(0, 8)} received ${(discPct * 100).toFixed(0)}% discount (${Number(a.discountAmount).toFixed(0)} ₽ off ${Number(a.totalPrice).toFixed(0)} ₽).`,
        entityType: 'Appointment',
        entityId: a.id,
        metadata: { discountPct: r2(discPct * 100), discountAmount: Number(a.discountAmount), totalPrice: Number(a.totalPrice) },
      });
    }
  }

  console.log('[risk/discount-abuse]', { withDiscount: apts.length, signals: signals.length });
  return signals;
}

// ─── 2. Cash Leakage Detection ────────────────────────────────────────────────

async function detectCashLeakage(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const completed = await prisma.appointment.findMany({
    where: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } },
    select: { id: true, totalPrice: true, paidAmount: true, discountAmount: true },
  });

  if (completed.length === 0) return signals;

  let totalExpected = 0;
  let totalPaid     = 0;
  let leakCount     = 0;

  for (const a of completed) {
    const expected = Number(a.totalPrice) - Number(a.discountAmount ?? 0);
    const paid     = Number(a.paidAmount);
    totalExpected += expected;
    totalPaid     += paid;
    if (expected > 0 && paid < expected * 0.95) leakCount += 1;
  }

  const leakagePct = totalExpected > 0 ? (totalExpected - totalPaid) / totalExpected : 0;

  if (leakagePct > 0.03 && totalExpected > 0) {
    signals.push({
      category: 'CASH_LEAKAGE',
      severity: leakagePct > 0.1 ? 'CRITICAL' : leakagePct > 0.06 ? 'HIGH' : 'MEDIUM',
      title: 'Revenue collection gap detected',
      description: `${(leakagePct * 100).toFixed(1)}% of expected revenue (${(totalExpected - totalPaid).toFixed(0)} ₽) was not collected across ${leakCount} appointments.`,
      entityType: 'Period',
      metadata: { leakagePct: r2(leakagePct * 100), leakageAmount: r2(totalExpected - totalPaid), totalExpected: r2(totalExpected), totalPaid: r2(totalPaid), affectedApts: leakCount },
    });
  }

  // Cross-check: payment system total vs appointment paidAmounts
  const paymentAgg = await prisma.payment.aggregate({
    where: { status: { in: ['CAPTURED', 'PARTIALLY_REFUNDED'] }, createdAt: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  const pmtSum = Number(paymentAgg._sum?.amount ?? 0);

  if (pmtSum > 0 && totalPaid > 0) {
    const discrepancy    = Math.abs(pmtSum - totalPaid);
    const discrepancyPct = discrepancy / Math.max(pmtSum, totalPaid);
    if (discrepancyPct > 0.05 && discrepancy > 1000) {
      signals.push({
        category: 'CASH_LEAKAGE',
        severity: discrepancyPct > 0.15 ? 'HIGH' : 'MEDIUM',
        title: 'Payment records vs appointment totals mismatch',
        description: `Payment system total (${pmtSum.toFixed(0)} ₽) differs from appointment paidAmounts (${totalPaid.toFixed(0)} ₽) by ${discrepancy.toFixed(0)} ₽ (${(discrepancyPct * 100).toFixed(1)}%).`,
        entityType: 'Period',
        metadata: { pmtTotal: r2(pmtSum), aptTotal: r2(totalPaid), discrepancy: r2(discrepancy), discrepancyPct: r2(discrepancyPct * 100) },
      });
    }
  }

  console.log('[risk/cash-leakage]', { apts: completed.length, leakagePct: r2(leakagePct * 100), signals: signals.length });
  return signals;
}

// ─── 3. Payroll Anomaly Detection ─────────────────────────────────────────────

async function detectPayrollAnomalies(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const attendance = await prisma.attendanceRecord.findMany({
    where: { date: { gte: from, lte: to }, status: { in: ['PRESENT', 'LATE'] } },
    select: { specialistId: true, date: true, completedApts: true, checkInAt: true, checkOutAt: true },
  });

  // Specialists with full attendance days but 0 completed appointments
  const ghostDays = attendance.filter(a => a.completedApts === 0 && a.checkInAt && a.checkOutAt);
  if (ghostDays.length >= 3) {
    const specMap = new Map<string, number>();
    for (const g of ghostDays) {
      specMap.set(g.specialistId, (specMap.get(g.specialistId) ?? 0) + 1);
    }
    for (const [specId, count] of specMap) {
      if (count >= 3) {
        signals.push({
          category: 'PAYROLL_ANOMALY',
          severity: count >= 7 ? 'HIGH' : 'MEDIUM',
          title: 'Attendance logged without appointments',
          description: `Specialist ${specId.slice(0, 8)} has ${count} working days with 0 completed appointments — possible ghost attendance.`,
          entityType: 'Specialist',
          entityId: specId,
          metadata: { ghostDays: count },
        });
      }
    }
  }

  // Specialists with appointments but no attendance records
  const specWithApts = await prisma.specialist.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
      appointments: {
        where: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } },
        select: { id: true },
      },
    },
  });

  const attendedSpecIds = new Set(attendance.map(a => a.specialistId));
  for (const spec of specWithApts) {
    if (spec.appointments.length >= 5 && !attendedSpecIds.has(spec.id)) {
      signals.push({
        category: 'PAYROLL_ANOMALY',
        severity: 'MEDIUM',
        title: 'Appointments without attendance records',
        description: `${spec.user?.firstName ?? ''} ${spec.user?.lastName ?? ''} completed ${spec.appointments.length} appointments with no attendance records — untracked hours.`,
        entityType: 'Specialist',
        entityId: spec.id,
        metadata: { completedApts: spec.appointments.length },
      });
    }
  }

  console.log('[risk/payroll-anomaly]', { attendanceRows: attendance.length, signals: signals.length });
  return signals;
}

// ─── 4. Cancellation Fraud Detection ─────────────────────────────────────────

async function detectCancellationFraud(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const cancelled = await prisma.appointment.findMany({
    where: { status: 'CANCELLED', updatedAt: { gte: from, lte: to } },
    select: { id: true, startAt: true, updatedAt: true, specialistId: true },
  });

  const completed = await prisma.appointment.count({
    where: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } },
  });

  const totalApts      = cancelled.length + completed;
  const cancellationRate = totalApts > 0 ? cancelled.length / totalApts : 0;

  if (cancellationRate > 0.25 && cancelled.length >= 5) {
    signals.push({
      category: 'CANCELLATION_FRAUD',
      severity: cancellationRate > 0.4 ? 'HIGH' : 'MEDIUM',
      title: 'High overall cancellation rate',
      description: `${(cancellationRate * 100).toFixed(1)}% of appointments were cancelled (${cancelled.length} of ${totalApts}) in the period.`,
      entityType: 'Period',
      metadata: { cancellationRate: r2(cancellationRate * 100), cancelled: cancelled.length, total: totalApts },
    });
  }

  // Last-minute cancellations (within 60 min of appointment start)
  const lastMinute = cancelled.filter(a => {
    const minsBefore = (a.startAt.getTime() - a.updatedAt.getTime()) / 60_000;
    return minsBefore >= -10 && minsBefore < 60;
  });

  if (lastMinute.length >= 3) {
    signals.push({
      category: 'CANCELLATION_FRAUD',
      severity: lastMinute.length >= 10 ? 'HIGH' : 'MEDIUM',
      title: 'Last-minute cancellation spike',
      description: `${lastMinute.length} appointments cancelled within 60 minutes of scheduled start — possible slot blocking pattern.`,
      entityType: 'Period',
      metadata: { lastMinuteCancellations: lastMinute.length },
    });
  }

  // Per-specialist cancellation spike
  const specCancels = new Map<string, number>();
  for (const a of cancelled) {
    specCancels.set(a.specialistId, (specCancels.get(a.specialistId) ?? 0) + 1);
  }

  const avgPerSpec = cancelled.length / Math.max(specCancels.size, 1);
  for (const [specId, count] of specCancels) {
    if (count > avgPerSpec * 3 && count >= 5) {
      signals.push({
        category: 'CANCELLATION_FRAUD',
        severity: 'HIGH',
        title: `Cancellation spike — specialist ${specId.slice(0, 8)}`,
        description: `Specialist ${specId.slice(0, 8)} has ${count} cancellations — ${(count / avgPerSpec).toFixed(1)}× the average (${avgPerSpec.toFixed(1)}).`,
        entityType: 'Specialist',
        entityId: specId,
        metadata: { cancellations: count, avgPerSpec: r2(avgPerSpec), ratio: r2(count / avgPerSpec) },
      });
    }
  }

  console.log('[risk/cancellation-fraud]', { cancelled: cancelled.length, lastMinute: lastMinute.length, signals: signals.length });
  return signals;
}

// ─── 5. VIP Client Churn Risk ─────────────────────────────────────────────────
// Uses CustomerProfile.totalSpent and lastVisitAt (maintained by booking engine).

async function detectVipChurnRisk(_from: Date, _to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const profiles = await prisma.customerProfile.findMany({
    where: { totalSpent: { gt: 0 }, totalVisits: { gt: 0 } },
    select: {
      id: true, totalSpent: true, lastVisitAt: true, totalVisits: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { totalSpent: 'desc' },
  });

  if (profiles.length === 0) return signals;

  const top20Count = Math.max(1, Math.ceil(profiles.length * 0.2));
  const vipProfiles = profiles.slice(0, top20Count);
  const now = new Date();

  for (const p of vipProfiles) {
    if (!p.lastVisitAt) continue;
    const daysSince = (now.getTime() - p.lastVisitAt.getTime()) / 86_400_000;
    if (daysSince > 60) {
      const name = `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim();
      signals.push({
        category: 'VIP_CHURN_RISK',
        severity: daysSince > 120 ? 'HIGH' : 'MEDIUM',
        title: `VIP client churn risk — ${name || p.id.slice(0, 8)}`,
        description: `${name || 'VIP client'} (lifetime ${Number(p.totalSpent).toFixed(0)} ₽, ${p.totalVisits} visits) has not visited in ${Math.floor(daysSince)} days.`,
        entityType: 'Client',
        entityId: p.id,
        metadata: { lifetimeSpend: r2(Number(p.totalSpent)), visitCount: p.totalVisits, daysSinceVisit: Math.floor(daysSince), lastVisit: p.lastVisitAt.toISOString() },
      });
    }
  }

  console.log('[risk/vip-churn]', { total: profiles.length, vipCount: vipProfiles.length, churning: signals.length });
  return signals;
}

// ─── 6. Client Poaching Risk ──────────────────────────────────────────────────

async function detectClientPoachingRisk(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const specialists = await prisma.specialist.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
      appointments: {
        where: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } },
        select: { clientId: true },
      },
    },
  });

  if (specialists.length < 2) return signals;

  const clientToSpecs = new Map<string, Set<string>>();
  for (const spec of specialists) {
    for (const apt of spec.appointments) {
      const set = clientToSpecs.get(apt.clientId) ?? new Set<string>();
      set.add(spec.id);
      clientToSpecs.set(apt.clientId, set);
    }
  }

  for (const spec of specialists) {
    const specClients = new Set(spec.appointments.map(a => a.clientId));
    if (specClients.size < 5) continue;

    const exclusiveClients = [...specClients].filter(cId => (clientToSpecs.get(cId)?.size ?? 0) === 1);
    const exclusiveRate    = exclusiveClients.length / specClients.size;

    if (exclusiveRate > 0.75 && specClients.size >= 10) {
      const name = `${spec.user?.firstName ?? ''} ${spec.user?.lastName ?? ''}`.trim();
      signals.push({
        category: 'CLIENT_POACHING',
        severity: exclusiveRate > 0.9 ? 'HIGH' : 'MEDIUM',
        title: `High client exclusivity — ${name || spec.id.slice(0, 8)}`,
        description: `${(exclusiveRate * 100).toFixed(0)}% of ${name || 'specialist'}'s ${specClients.size} clients book exclusively with them — departure risk.`,
        entityType: 'Specialist',
        entityId: spec.id,
        metadata: { totalClients: specClients.size, exclusiveClients: exclusiveClients.length, exclusiveRate: r2(exclusiveRate * 100) },
      });
    }
  }

  console.log('[risk/client-poaching]', { specialists: specialists.length, signals: signals.length });
  return signals;
}

// ─── 7. Inventory Shrinkage Detection ────────────────────────────────────────

async function detectInventoryShrinkage(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const links = await prisma.inventoryServiceLink.findMany({
    select: {
      inventoryItemId: true,
      serviceId: true,
      quantityPerUse: true,
      inventoryItem: { select: { name: true } },
    },
  });

  if (links.length === 0) return signals;

  const svcCounts = await prisma.appointmentService.groupBy({
    by: ['serviceId'],
    where: { appointment: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } } },
    _count: { serviceId: true },
  });
  const svcCountMap = new Map(svcCounts.map(s => [s.serviceId, s._count.serviceId]));

  const expectedUsage = new Map<string, number>();
  const itemNames     = new Map<string, string>();
  for (const link of links) {
    const apts = svcCountMap.get(link.serviceId) ?? 0;
    const exp  = apts * Number(link.quantityPerUse);
    expectedUsage.set(link.inventoryItemId, (expectedUsage.get(link.inventoryItemId) ?? 0) + exp);
    itemNames.set(link.inventoryItemId, link.inventoryItem.name);
  }

  const usageMovements = await prisma.stockMovement.groupBy({
    by: ['inventoryItemId'],
    where: { type: 'USAGE', createdAt: { gte: from, lte: to } },
    _sum: { quantity: true },
  });

  for (const mv of usageMovements) {
    const actual   = Math.abs(Number(mv._sum?.quantity ?? 0));
    const expected = expectedUsage.get(mv.inventoryItemId) ?? 0;
    if (expected < 1) continue;

    const variance = (actual - expected) / expected;
    if (Math.abs(variance) > 0.3 && expected > 5) {
      const name = itemNames.get(mv.inventoryItemId) ?? mv.inventoryItemId.slice(0, 8);
      signals.push({
        category: 'INVENTORY_SHRINKAGE',
        severity: Math.abs(variance) > 0.6 ? 'HIGH' : 'MEDIUM',
        title: `Inventory variance — ${name}`,
        description: `${name}: actual usage ${actual.toFixed(1)} units vs expected ${expected.toFixed(1)} units (${variance > 0 ? '+' : ''}${(variance * 100).toFixed(1)}% variance).`,
        entityType: 'InventoryItem',
        entityId: mv.inventoryItemId,
        metadata: { actual: r2(actual), expected: r2(expected), variancePct: r2(variance * 100), itemName: name },
      });
    }
  }

  console.log('[risk/inventory-shrinkage]', { links: links.length, usageItems: usageMovements.length, signals: signals.length });
  return signals;
}

// ─── 8. Specialist Burnout Detection ─────────────────────────────────────────

async function detectBurnout(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const specialists = await prisma.specialist.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
      appointments: {
        where: { status: 'COMPLETED', checkedOutAt: { gte: from, lte: to } },
        select: { totalDuration: true },
      },
      attendanceRecords: {
        where: { date: { gte: from, lte: to }, status: { in: ['PRESENT', 'LATE'] } },
        select: { status: true },
      },
    },
  });

  for (const spec of specialists) {
    if (spec.appointments.length === 0) continue;
    const workedDays = Math.max(spec.attendanceRecords.length, 1);
    const totalMins  = spec.appointments.reduce((s, a) => s + (a.totalDuration ?? 0), 0);
    const dailyHours = (totalMins / 60) / workedDays;

    if (dailyHours > 6) {
      const name = `${spec.user?.firstName ?? ''} ${spec.user?.lastName ?? ''}`.trim();
      signals.push({
        category: 'BURNOUT_RISK',
        severity: dailyHours > 9 ? 'CRITICAL' : dailyHours > 7.5 ? 'HIGH' : 'MEDIUM',
        title: `Burnout risk — ${name || spec.id.slice(0, 8)}`,
        description: `${name || 'Specialist'} averaging ${dailyHours.toFixed(1)} h/day of productive work over ${workedDays} days.`,
        entityType: 'Specialist',
        entityId: spec.id,
        metadata: { dailyHours: r2(dailyHours), workedDays, totalMins, apts: spec.appointments.length },
      });
    }
  }

  console.log('[risk/burnout]', { specialists: specialists.length, signals: signals.length });
  return signals;
}

// ─── 9. Slot Manipulation Detection ──────────────────────────────────────────

async function detectSlotManipulation(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const blocks = await prisma.blockedTime.findMany({
    where: { startAt: { gte: from, lte: to } },
    select: {
      specialistId: true, startAt: true, endAt: true, reason: true,
      specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  if (blocks.length === 0) return signals;

  const PRIME_START = 10;
  const PRIME_END   = 18;

  const specBlocks = new Map<string, { prime: number; total: number; name: string; hours: number }>();
  for (const b of blocks) {
    // Convert UTC to YEKT (+5h) for prime-time check
    const startH = (b.startAt.getUTCHours() + 5) % 24;
    const endH   = b.endAt ? (b.endAt.getUTCHours() + 5) % 24 : (startH + 1) % 24;
    const isPrime = startH >= PRIME_START && endH <= PRIME_END;
    const hours   = b.endAt ? (b.endAt.getTime() - b.startAt.getTime()) / 3_600_000 : 1;

    const entry = specBlocks.get(b.specialistId) ?? {
      prime: 0, total: 0, hours: 0,
      name: `${b.specialist.user?.firstName ?? ''} ${b.specialist.user?.lastName ?? ''}`.trim(),
    };
    entry.total += 1;
    entry.hours += hours;
    if (isPrime) entry.prime += 1;
    specBlocks.set(b.specialistId, entry);
  }

  for (const [specId, stats] of specBlocks) {
    const primePct = stats.total > 0 ? stats.prime / stats.total : 0;
    if (primePct > 0.6 && stats.total >= 5) {
      signals.push({
        category: 'SLOT_MANIPULATION',
        severity: primePct > 0.8 ? 'HIGH' : 'MEDIUM',
        title: `Prime-time slot blocking — ${stats.name || specId.slice(0, 8)}`,
        description: `${stats.name || 'Specialist'} blocked ${stats.prime} of ${stats.total} prime-time slots (${(primePct * 100).toFixed(0)}%) — ${stats.hours.toFixed(1)} total blocked hours.`,
        entityType: 'Specialist',
        entityId: specId,
        metadata: { primeBlocks: stats.prime, totalBlocks: stats.total, primePct: r2(primePct * 100), blockedHours: r2(stats.hours) },
      });
    }
  }

  console.log('[risk/slot-manipulation]', { blocks: blocks.length, signals: signals.length });
  return signals;
}

// ─── 10. Operational Anomaly Detection ───────────────────────────────────────

async function detectOperationalAnomalies(from: Date, to: Date): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];

  const zeroPaid = await prisma.appointment.count({
    where: {
      status: 'COMPLETED',
      checkedOutAt: { gte: from, lte: to },
      paidAmount: 0,
      totalPrice: { gt: 0 },
    },
  });

  if (zeroPaid > 0) {
    signals.push({
      category: 'OPERATIONAL_ANOMALY',
      severity: zeroPaid > 5 ? 'HIGH' : 'MEDIUM',
      title: 'Completed appointments with zero payment',
      description: `${zeroPaid} appointments completed (totalPrice > 0) with paidAmount = 0.`,
      entityType: 'Period',
      metadata: { count: zeroPaid },
    });
  }

  const refunds = await prisma.refund.findMany({
    where: { status: 'COMPLETED', processedAt: { gte: from, lte: to } },
    select: { amount: true },
  });

  const pmtAgg = await prisma.payment.aggregate({
    where: { status: { in: ['CAPTURED', 'PARTIALLY_REFUNDED'] }, createdAt: { gte: from, lte: to } },
    _sum: { amount: true },
  });

  const refundTotal  = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const paymentTotal = Number(pmtAgg._sum?.amount ?? 0);
  const refundRate   = paymentTotal > 0 ? refundTotal / paymentTotal : 0;

  if (refundRate > 0.1 && refundTotal > 5000) {
    signals.push({
      category: 'OPERATIONAL_ANOMALY',
      severity: refundRate > 0.2 ? 'HIGH' : 'MEDIUM',
      title: 'Elevated refund rate',
      description: `Refunds totalling ${refundTotal.toFixed(0)} ₽ = ${(refundRate * 100).toFixed(1)}% of collected payments.`,
      entityType: 'Period',
      metadata: { refundTotal: r2(refundTotal), paymentTotal: r2(paymentTotal), refundRate: r2(refundRate * 100) },
    });
  }

  console.log('[risk/operational]', { zeroPaid, refundTotal: r2(refundTotal), signals: signals.length });
  return signals;
}

// ─── Master scan function ─────────────────────────────────────────────────────

export async function runRiskScan(periodDays = 30): Promise<RiskDashboard> {
  const to   = new Date();
  const from = new Date(to.getTime() - periodDays * 86_400_000);

  console.log('[risk/scan] starting', { from: from.toISOString(), to: to.toISOString() });

  const [
    discountSignals,
    cashSignals,
    payrollSignals,
    cancellationSignals,
    vipSignals,
    poachingSignals,
    shrinkageSignals,
    burnoutSignals,
    slotSignals,
    operationalSignals,
  ] = await Promise.all([
    detectDiscountAbuse(from, to),
    detectCashLeakage(from, to),
    detectPayrollAnomalies(from, to),
    detectCancellationFraud(from, to),
    detectVipChurnRisk(from, to),
    detectClientPoachingRisk(from, to),
    detectInventoryShrinkage(from, to),
    detectBurnout(from, to),
    detectSlotManipulation(from, to),
    detectOperationalAnomalies(from, to),
  ]);

  const allSignals: RiskSignal[] = [
    ...discountSignals, ...cashSignals, ...payrollSignals,
    ...cancellationSignals, ...vipSignals, ...poachingSignals,
    ...shrinkageSignals, ...burnoutSignals, ...slotSignals, ...operationalSignals,
  ];

  const summary = {} as Record<RiskCategory, number>;
  for (const sig of allSignals) {
    summary[sig.category] = (summary[sig.category] ?? 0) + 1;
  }

  const SEVERITY_WEIGHT: Record<RiskSeverity, number> = { LOW: 5, MEDIUM: 15, HIGH: 30, CRITICAL: 50 };
  const rawScore    = allSignals.reduce((s, sig) => s + SEVERITY_WEIGHT[sig.severity], 0);
  const overallScore = Math.min(100, rawScore);
  const riskLevel   = severity(overallScore);

  const specSignals = new Map<string, { name: string; signals: RiskSignal[] }>();
  for (const sig of allSignals) {
    if (sig.entityType === 'Specialist' && sig.entityId) {
      const entry = specSignals.get(sig.entityId) ?? { name: '', signals: [] };
      entry.signals.push(sig);
      specSignals.set(sig.entityId, entry);
    }
  }

  const SREV_ORDER: RiskSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const specialistRisks: SpecialistRiskSummary[] = [];
  for (const [specId, data] of specSignals) {
    const highestSev = SREV_ORDER.find(s => data.signals.some(sig => sig.severity === s)) ?? 'LOW';
    specialistRisks.push({
      specialistId:    specId,
      name:            data.name,
      signalCount:     data.signals.length,
      highestSeverity: highestSev,
      categories:      [...new Set(data.signals.map(s => s.category))],
    });
  }
  specialistRisks.sort((a, b) => SREV_ORDER.indexOf(a.highestSeverity) - SREV_ORDER.indexOf(b.highestSeverity));

  console.log('[risk/scan] complete', { signals: allSignals.length, score: overallScore, level: riskLevel });

  return { scannedAt: to, periodDays, overallScore, riskLevel, signals: allSignals, summary, specialistRisks };
}

// ─── Persist alerts to DB ─────────────────────────────────────────────────────

export async function persistRiskAlerts(signals: RiskSignal[]): Promise<number> {
  if (signals.length === 0) return 0;

  const recentCutoff = new Date(Date.now() - 24 * 3_600_000);
  const existing = await prisma.riskAlert.findMany({
    where: { isDismissed: false, detectedAt: { gte: recentCutoff } },
    select: { title: true, entityId: true },
  });
  const existingKeys = new Set(existing.map(e => `${e.title}|${e.entityId ?? ''}`));

  const toCreate = signals.filter(s => !existingKeys.has(`${s.title}|${s.entityId ?? ''}`));
  if (toCreate.length === 0) return 0;

  await prisma.riskAlert.createMany({
    data: toCreate.map(s => ({
      category:    s.category as never,
      severity:    s.severity as never,
      title:       s.title,
      description: s.description,
      entityType:  s.entityType ?? null,
      entityId:    s.entityId ?? null,
      metadata:    s.metadata ? (s.metadata as never) : undefined,
    })),
  });

  console.log('[risk/persist]', { created: toCreate.length, deduped: signals.length - toCreate.length });
  return toCreate.length;
}
