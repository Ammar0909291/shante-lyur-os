export const dynamic = 'force-dynamic';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/infrastructure/config/prisma-client';
import { SpecialistProfileDisplay } from './_display';

export default async function SpecialistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const specialist = await prisma.specialist.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!specialist) notFound();

  const [revenueAgg, allStatusStats, topServiceRows, recentAppointments] = await Promise.all([
    prisma.appointment.aggregate({
      where: { specialistId: id, status: 'COMPLETED' },
      _sum: { totalPrice: true },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { specialistId: id },
      _count: { id: true },
    }),
    prisma.appointmentService.groupBy({
      by: ['serviceId'],
      where: { appointment: { specialistId: id, status: 'COMPLETED' } },
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: { specialistId: id },
      include: {
        client: { select: { firstName: true, lastName: true } },
        services: { include: { service: { select: { name: true } } } },
      },
      orderBy: { startAt: 'desc' },
      take: 20,
    }),
  ]);

  // Resolve service names
  const serviceIds = topServiceRows.map((r) => r.serviceId);
  const serviceNames = serviceIds.length > 0
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
    : [];
  const serviceMap = new Map(serviceNames.map((s) => [s.id, s.name]));

  const totalRevenue = Number(revenueAgg._sum.totalPrice ?? 0);
  const completedCount = revenueAgg._count.id;
  const totalAll = allStatusStats.reduce((sum, s) => sum + s._count.id, 0);
  const avgCheck = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

  const startDate = specialist.createdAt;
  const daysSince = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const monthsSince = Math.floor(daysSince / 30);

  return (
    <SpecialistProfileDisplay
      specialist={{
        id: specialist.id,
        firstName: specialist.user.firstName,
        lastName: specialist.user.lastName,
        phone: specialist.user.phone ?? null,
        specialization: specialist.specialization,
        bio: specialist.bio,
        experienceYears: specialist.experienceYears,
        rating: specialist.rating !== null ? Number(specialist.rating) : null,
        reviewCount: specialist.reviewCount,
        status: specialist.status,
        color: specialist.color,
      }}
      stats={{ totalAll, completedCount, totalRevenue, avgCheck, monthsSince }}
      topServices={topServiceRows.map((r) => ({
        serviceId: r.serviceId,
        serviceName: serviceMap.get(r.serviceId) ?? 'Service',
        count: r._count.id,
        totalPrice: Number(r._sum.price ?? 0),
      }))}
      statusBreakdown={allStatusStats.map((s) => ({ status: s.status, count: s._count.id }))}
      recentAppointments={recentAppointments.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        totalPrice: Number(a.totalPrice),
        clientFirstName: a.client.firstName,
        clientLastName: a.client.lastName,
        firstServiceName: a.services[0]?.service.name ?? null,
        status: a.status,
      }))}
    />
  );
}
