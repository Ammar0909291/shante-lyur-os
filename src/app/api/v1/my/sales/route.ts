export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('Unauthorized', 401);

  // RECEPTIONIST cannot see sales/commissions
  if (role === 'RECEPTIONIST') return err('Access denied', 403);

  const { searchParams } = new URL(req.url);
  const from  = searchParams.get('from');
  const to    = searchParams.get('to');
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  if (!from || !to) return err('from and to are required');

  const specialist = await prisma.specialist.findUnique({ where: { userId }, select: { id: true } });
  if (!specialist) return err('Specialist not found', 404);

  const fromDate = new Date(from);
  const toDate   = new Date(to + 'T23:59:59.999Z');

  const [total, entries] = await Promise.all([
    prisma.saleCommissionEntry.count({
      where: { userId, saleDate: { gte: fromDate, lte: toDate } },
    }),
    prisma.saleCommissionEntry.findMany({
      where: { userId, saleDate: { gte: fromDate, lte: toDate } },
      skip:  (page - 1) * limit,
      take:  limit,
      orderBy: { saleDate: 'desc' },
      include: {
        appointment: {
          select: {
            totalPrice: true,
            services:   { include: { service: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const sales = entries.map((e) => ({
    id:               e.id,
    saleDate:         e.saleDate,
    services:         e.appointment.services.map((s) => s.service.name).join(', '),
    saleTotal:        Number(e.appointment.totalPrice),
    commissionBasis:  Number(e.commissionBasis),
    commissionAmount: Number(e.commissionAmount),
    status:           e.status,
  }));

  const totalCommission = entries.reduce((s, e) => s + Number(e.commissionAmount), 0);

  return ok({
    sales,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: { totalCommission: Math.round(totalCommission * 100) / 100 },
  });
}
