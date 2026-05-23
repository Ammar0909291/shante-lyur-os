export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requesterId = req.headers.get('x-user-id');
  if (!requesterId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, firstName: true, lastName: true },
  });

  if (!user || user.role !== 'CLIENT') {
    return apiError('NOT_FOUND', 'Client not found', 404);
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: id },
    select: {
      prepaidBalance: true,
      loyaltyTier: true,
      loyaltyPoints: true,
    },
  });

  const completedAppts = await prisma.appointment.findMany({
    where: { clientId: id, status: 'COMPLETED' },
    select: {
      id: true,
      totalPrice: true,
      startAt: true,
      specialistId: true,
      specialist: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      services: {
        select: {
          serviceId: true,
          price: true,
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { startAt: 'desc' },
  });

  const unpaidAppts = await prisma.appointment.findMany({
    where: {
      clientId: id,
      paymentStatus: { in: ['UNPAID', 'PARTIAL_PAID', 'DEPOSIT_PAID', 'OVERDUE'] },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { totalPrice: true, paidAmount: true },
  });

  const payments = await prisma.payment.findMany({
    where: { appointment: { clientId: id } },
    select: {
      id: true,
      amount: true,
      provider: true,
      status: true,
      paidAt: true,
      appointmentId: true,
      isDeposit: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const balanceTransactions = await prisma.clientBalanceTransaction.findMany({
    where: { clientId: id },
    select: {
      id: true,
      amount: true,
      balanceAfter: true,
      type: true,
      note: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const lifetimeSpent = completedAppts.reduce(
    (sum, a) => sum + Number(a.totalPrice),
    0,
  );
  const totalVisits = completedAppts.length;
  const avgSpendPerVisit = totalVisits > 0 ? lifetimeSpent / totalVisits : 0;

  const unpaidBalance = unpaidAppts.reduce(
    (sum, a) => sum + (Number(a.totalPrice) - Number(a.paidAmount)),
    0,
  );

  const prepaidBalance = profile ? Number(profile.prepaidBalance) : 0;
  const loyaltyTier = profile?.loyaltyTier ?? 'BRONZE';
  const loyaltyPoints = profile?.loyaltyPoints ?? 0;

  const lastVisitAt =
    completedAppts.length > 0 ? completedAppts[0].startAt : null;

  const daysSinceLastVisit = lastVisitAt
    ? Math.floor((Date.now() - lastVisitAt.getTime()) / 86_400_000)
    : null;

  const inactiveAlert = daysSinceLastVisit !== null && daysSinceLastVisit > 60;
  const isHighValue = lifetimeSpent >= 50000;
  const hasOverdueBalance = unpaidBalance > 0;

  const serviceMap = new Map<
    string,
    { serviceId: string; serviceName: string; count: number; totalSpent: number }
  >();
  for (const appt of completedAppts) {
    for (const svc of appt.services) {
      const existing = serviceMap.get(svc.serviceId);
      if (existing) {
        existing.count += 1;
        existing.totalSpent += Number(svc.price);
      } else {
        serviceMap.set(svc.serviceId, {
          serviceId: svc.serviceId,
          serviceName: svc.service.name,
          count: 1,
          totalSpent: Number(svc.price),
        });
      }
    }
  }
  const topServices = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const specialistMap = new Map<string, { name: string; count: number }>();
  for (const appt of completedAppts) {
    const name = appt.specialist?.user
      ? `${appt.specialist.user.firstName} ${appt.specialist.user.lastName}`
      : appt.specialistId;
    const existing = specialistMap.get(appt.specialistId);
    if (existing) {
      existing.count += 1;
    } else {
      specialistMap.set(appt.specialistId, { name, count: 1 });
    }
  }
  let favoriteSpecialist: { name: string; count: number } | null = null;
  for (const entry of specialistMap.values()) {
    if (!favoriteSpecialist || entry.count > favoriteSpecialist.count) {
      favoriteSpecialist = entry;
    }
  }

  const sortedVisits = [...completedAppts]
    .map((a) => a.startAt.getTime())
    .sort((a, b) => a - b);
  let repeatCount = 0;
  for (let i = 1; i < sortedVisits.length; i++) {
    const daysBetween = (sortedVisits[i] - sortedVisits[i - 1]) / 86_400_000;
    if (daysBetween <= 60) repeatCount += 1;
  }
  const repeatClientRate =
    totalVisits > 1 ? Math.round((repeatCount / (totalVisits - 1)) * 100) : 0;

  return ok({
    lifetimeSpent,
    unpaidBalance,
    prepaidBalance,
    totalVisits,
    avgSpendPerVisit,
    loyaltyTier,
    loyaltyPoints,
    lastVisitAt,
    daysSinceLastVisit,
    inactiveAlert,
    isHighValue,
    hasOverdueBalance,
    topServices,
    favoriteSpecialist,
    paymentHistory: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      provider: p.provider,
      status: p.status,
      paidAt: p.paidAt,
      appointmentId: p.appointmentId,
      isDeposit: p.isDeposit,
    })),
    balanceTransactions: balanceTransactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      type: t.type,
      note: t.note,
      createdAt: t.createdAt,
    })),
    repeatClientRate,
  });
}
