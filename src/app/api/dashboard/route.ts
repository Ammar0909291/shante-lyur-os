export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      todayAppointments,
      pendingCount,
      monthRevenue,
      prevMonthRevenue,
      totalClients,
      prevMonthClients,
      todayAppointmentsList,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { startAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.appointment.count({
        where: { startAt: { gte: todayStart, lte: todayEnd }, status: 'PENDING' },
      }),
      prisma.appointment.aggregate({
        where: { startAt: { gte: monthStart }, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
      prisma.appointment.aggregate({
        where: { startAt: { gte: prevMonthStart, lte: prevMonthEnd }, status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
      prisma.customerProfile.count(),
      prisma.customerProfile.count({ where: { createdAt: { lt: monthStart } } }),
      prisma.appointment.findMany({
        where: { startAt: { gte: todayStart, lte: todayEnd } },
        include: {
          client: { select: { firstName: true, lastName: true } },
          specialist: { include: { user: { select: { firstName: true, lastName: true } } } },
          services: { include: { service: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { startAt: 'asc' },
        take: 20,
      }),
    ]);

    const revMonth = Number(monthRevenue._sum.totalPrice ?? 0);
    const revPrevMonth = Number(prevMonthRevenue._sum.totalPrice ?? 0);
    const revTrend = revPrevMonth > 0 ? Math.round(((revMonth - revPrevMonth) / revPrevMonth) * 100) : 0;

    const newClientsThisMonth = totalClients - prevMonthClients;

    const appointments = todayAppointmentsList.map((a) => ({
      id: a.id,
      client: `${a.client.firstName} ${a.client.lastName}`,
      service: a.services[0]?.service.name ?? '—',
      specialist: `${a.specialist.user.firstName} ${a.specialist.user.lastName.charAt(0)}.`,
      time: a.startAt,
      status: a.status,
      amount: Number(a.totalPrice),
    }));

    return ok({
      stats: {
        todayBookings: { value: todayAppointments, pending: pendingCount },
        revenueMtd: { value: revMonth, trend: revTrend },
        activeClients: { value: totalClients, newThisMonth: newClientsThisMonth },
      },
      appointments,
    });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
