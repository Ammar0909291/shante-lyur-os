export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const HOURLY_RATE = 250; // ₽ per hour
const BONUS_RATES = { FIRST_TIME: 0.02, EXISTING: 0.03, RETURNING: 0.04 } as const;

type ClientType = keyof typeof BONUS_RATES;

// FIRST_TIME  — no prior completed appointments
// EXISTING    — has prior completed appointments AND has future booked procedures remaining
// RETURNING   — has prior completed appointments AND no future procedures left
function classifyClient(
  clientId: string,
  _apptStartAt: Date,
  priorCountMap: Map<string, number>,
  futurePendingMap: Map<string, number>,
): ClientType {
  const priorCount = priorCountMap.get(clientId) ?? 0;
  if (priorCount === 0) return 'FIRST_TIME';
  const hasFuture = (futurePendingMap.get(clientId) ?? 0) > 0;
  return hasFuture ? 'EXISTING' : 'RETURNING';
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateTo   = to   ? new Date(to + 'T23:59:59') : new Date();

  const [specialists, appts, hoursEntries] = await Promise.all([
    prisma.specialist.findMany({
      where:   { status: 'ACTIVE' },
      select:  { id: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { lastName: 'asc' } },
    }),
    prisma.appointment.findMany({
      where:  { status: 'COMPLETED', startAt: { gte: dateFrom, lte: dateTo } },
      select: { id: true, specialistId: true, clientId: true, totalPrice: true, startAt: true },
    }),
    prisma.payrollHoursEntry.findMany({
      where:  { periodFrom: dateFrom, periodTo: dateTo },
      select: { specialistId: true, hoursWorked: true },
    }),
  ]);

  // Batch-fetch client data for bonus classification
  const clientIds = Array.from(new Set(appts.map((a) => a.clientId)));

  const [priorCompleted, futurePending] = clientIds.length > 0
    ? await Promise.all([
        // Count of completed appointments per client before the period start
        prisma.appointment.groupBy({
          by:     ['clientId'],
          where:  { clientId: { in: clientIds }, status: 'COMPLETED', startAt: { lt: dateFrom } },
          _count: { id: true },
        }),
        // Count of future pending/confirmed appointments per client (from now)
        prisma.appointment.groupBy({
          by:     ['clientId'],
          where:  {
            clientId: { in: clientIds },
            status:   { in: ['PENDING', 'CONFIRMED'] },
            startAt:  { gt: new Date() },
          },
          _count: { id: true },
        }),
      ])
    : [[], []];

  const priorCountMap   = new Map(priorCompleted.map((r) => [r.clientId, r._count.id]));
  const futurePendingMap = new Map(futurePending.map((r) => [r.clientId, r._count.id]));

  const hoursMap = new Map(hoursEntries.map((e) => [e.specialistId, Number(e.hoursWorked)]));

  // Aggregate per specialist
  type BonusBucket = { count: number; amount: number };
  type Agg = {
    completedBookings: number;
    grossRevenue: number;
    bonuses: Record<ClientType, BonusBucket>;
  };

  const aggMap = new Map<string, Agg>();
  for (const a of appts) {
    if (!aggMap.has(a.specialistId)) {
      aggMap.set(a.specialistId, {
        completedBookings: 0,
        grossRevenue: 0,
        bonuses: {
          FIRST_TIME: { count: 0, amount: 0 },
          EXISTING:   { count: 0, amount: 0 },
          RETURNING:  { count: 0, amount: 0 },
        },
      });
    }
    const entry = aggMap.get(a.specialistId)!;
    const price = Number(a.totalPrice);
    const type  = classifyClient(a.clientId, a.startAt, priorCountMap, futurePendingMap);
    entry.completedBookings += 1;
    entry.grossRevenue      += price;
    entry.bonuses[type].count  += 1;
    entry.bonuses[type].amount += price * BONUS_RATES[type];
  }

  const rows = specialists.map((sp) => {
    const agg = aggMap.get(sp.id) ?? {
      completedBookings: 0,
      grossRevenue: 0,
      bonuses: {
        FIRST_TIME: { count: 0, amount: 0 },
        EXISTING:   { count: 0, amount: 0 },
        RETURNING:  { count: 0, amount: 0 },
      },
    };
    const hours      = hoursMap.get(sp.id) ?? 0;
    const baseSalary = Math.round(hours * HOURLY_RATE * 100) / 100;
    const totalBonus = Math.round(
      (agg.bonuses.FIRST_TIME.amount + agg.bonuses.EXISTING.amount + agg.bonuses.RETURNING.amount) * 100,
    ) / 100;
    return {
      specialistId:      sp.id,
      name:              `${sp.user.firstName} ${sp.user.lastName}`.trim(),
      hoursWorked:       hours,
      baseSalary,
      bonuses: {
        firstTime: { count: agg.bonuses.FIRST_TIME.count, amount: Math.round(agg.bonuses.FIRST_TIME.amount * 100) / 100 },
        existing:  { count: agg.bonuses.EXISTING.count,   amount: Math.round(agg.bonuses.EXISTING.amount   * 100) / 100 },
        returning: { count: agg.bonuses.RETURNING.count,  amount: Math.round(agg.bonuses.RETURNING.amount  * 100) / 100 },
      },
      totalBonus,
      totalPay:          Math.round((baseSalary + totalBonus) * 100) / 100,
      completedBookings: agg.completedBookings,
      grossRevenue:      Math.round(agg.grossRevenue * 100) / 100,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      hoursWorked:       acc.hoursWorked + r.hoursWorked,
      baseSalary:        Math.round((acc.baseSalary + r.baseSalary) * 100) / 100,
      totalBonus:        Math.round((acc.totalBonus + r.totalBonus) * 100) / 100,
      totalPay:          Math.round((acc.totalPay + r.totalPay) * 100) / 100,
      completedBookings: acc.completedBookings + r.completedBookings,
      grossRevenue:      Math.round((acc.grossRevenue + r.grossRevenue) * 100) / 100,
    }),
    { hoursWorked: 0, baseSalary: 0, totalBonus: 0, totalPay: 0, completedBookings: 0, grossRevenue: 0 },
  );

  return R.success({
    from: dateFrom.toISOString(),
    to:   dateTo.toISOString(),
    hourlyRate:  HOURLY_RATE,
    bonusRates:  BONUS_RATES,
    rows,
    totals,
  });
}
