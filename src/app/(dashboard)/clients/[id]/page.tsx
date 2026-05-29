export const dynamic = 'force-dynamic';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/infrastructure/config/prisma-client';
import { ClientProfileDisplay } from './_display';
import type { ClientDisplayAppointment, ClientDisplayProps } from './_display';

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, statusStats, topServiceRows, unpaidAgg, finProfile, commPref] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: 'CLIENT' },
      include: {
        customerProfile: {
          include: { allergies: { take: 10 } },
        },
        clientAppointments: {
          include: {
            services: { include: { service: { select: { name: true } } } },
            specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
            location: { select: { name: true } },
          },
          orderBy: { startAt: 'desc' },
          take: 20,
        },
      },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { clientId: id },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.appointmentService.groupBy({
      by: ['serviceId'],
      where: { appointment: { clientId: id } },
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.appointment.aggregate({
      where: {
        clientId: id,
        paymentStatus: { in: ['UNPAID', 'PARTIAL_PAID', 'DEPOSIT_PAID', 'OVERDUE'] },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      _sum: { totalPrice: true, paidAmount: true },
    }),
    prisma.customerProfile.findUnique({
      where: { userId: id },
      select: { prepaidBalance: true },
    }),
    (prisma as unknown as {
      communicationPreference: {
        findUnique: (args: unknown) => Promise<{
          telegramChatId: string | null;
          telegramEnabled: boolean;
          whatsappPhone: string | null;
          whatsappEnabled: boolean;
        } | null>;
      };
    }).communicationPreference.findUnique({
      where: { userId: id },
      select: { telegramChatId: true, telegramEnabled: true, whatsappPhone: true, whatsappEnabled: true },
    }),
  ]);

  if (!user) notFound();

  // Resolve service names
  const serviceIds = topServiceRows.map((r) => r.serviceId);
  const serviceNames = serviceIds.length > 0
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
    : [];
  const serviceMap = new Map(serviceNames.map((s) => [s.id, s.name]));

  // Favorite specialist
  const specRows = await prisma.appointment.groupBy({
    by: ['specialistId'],
    where: { clientId: id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  });
  let favSpecialist: string | null = null;
  if (specRows[0]) {
    const sp = await prisma.specialist.findUnique({
      where: { id: specRows[0].specialistId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (sp) favSpecialist = `${sp.user.firstName} ${sp.user.lastName}`;
  }

  const profile = user.customerProfile;
  const appointments = user.clientAppointments;
  const totalSpent = profile ? Number(profile.totalSpent) : 0;
  const totalVisits = profile?.totalVisits ?? 0;
  const avgSpend = totalVisits > 0 ? Math.round(totalSpent / totalVisits) : 0;

  const lastVisit = profile?.lastVisitAt ?? appointments[0]?.startAt ?? null;
  const firstVisit = profile?.firstVisitAt ?? (appointments.length > 0 ? appointments[appointments.length - 1].startAt : null);

  const cancelledCount = statusStats.find((s) => s.status === 'CANCELLED')?._count.id ?? 0;
  const noShowCount = statusStats.find((s) => s.status === 'NO_SHOW')?._count.id ?? 0;
  const totalAll = statusStats.reduce((sum, s) => sum + s._count.id, 0);

  const unpaidBalance = Math.max(
    0,
    Number(unpaidAgg._sum.totalPrice ?? 0) - Number(unpaidAgg._sum.paidAmount ?? 0),
  );
  const prepaidBalance = Number(finProfile?.prepaidBalance ?? 0);
  const isHighValue = totalSpent >= 50000;

  // Serialize for client component
  const displayAppointments: ClientDisplayAppointment[] = appointments.map((a) => ({
    id: a.id,
    startAt: a.startAt.toISOString(),
    status: a.status,
    totalPrice: Number(a.totalPrice),
    serviceName: a.services[0]?.service.name ?? null,
    specialistFirstName: a.specialist.user.firstName,
    specialistLastName: a.specialist.user.lastName,
  }));

  const props: ClientDisplayProps = {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? null,
      status: user.status,
    },
    profile: profile ? {
      loyaltyTier: profile.loyaltyTier ?? null,
      notes: profile.notes ?? null,
      allergies: profile.allergies.map((a) => ({ id: a.id, allergen: a.allergen, severity: a.severity })),
      totalSpent,
      totalVisits,
    } : null,
    commPref: commPref ?? null,
    computed: {
      totalSpent,
      totalVisits,
      avgSpend,
      cancelledCount,
      noShowCount,
      totalAll,
      unpaidBalance,
      prepaidBalance,
      isHighValue,
      firstVisit: firstVisit ? new Date(firstVisit).toISOString() : null,
      lastVisit: lastVisit ? new Date(lastVisit).toISOString() : null,
      favSpecialist,
    },
    topServices: topServiceRows.map((r) => ({
      serviceId: r.serviceId,
      serviceName: serviceMap.get(r.serviceId) ?? null,
      count: r._count.id,
      total: Number(r._sum.price ?? 0),
    })),
    appointments: displayAppointments,
  };

  return <ClientProfileDisplay {...props} />;
}
