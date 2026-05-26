export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  STANDARD_SALE:    'Стандартная комиссия',
  NEW_CLIENT:       'Новый клиент',
  RETURNING_CLIENT: 'Возврат клиента',
  UPSELL:           'Допродажа',
  REFERRAL:         'Реферал',
  TARGET_BONUS:     'Бонус за план',
  QUALITY_BONUS:    'Бонус за качество',
  CUSTOM:           'Особый бонус',
};

export async function GET(
  req: NextRequest,
  { params }: { params: { specialistId: string } },
) {
  const { specialistId } = params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) return err('from and to are required');

  const fromDate = new Date(from);
  const toDate   = new Date(to + 'T23:59:59.999Z');

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { id: true, userId: true },
  });
  if (!specialist) return err('Specialist not found', 404);

  // Sale commissions (auto-generated from SaleCommissionEntry)
  const saleEntries = await prisma.saleCommissionEntry.findMany({
    where: {
      userId:   specialist.userId,
      saleDate: { gte: fromDate, lte: toDate },
    },
    include: {
      appointment: {
        select: {
          client:     { select: { firstName: true, lastName: true } },
          services:   { include: { service: { select: { name: true } } } },
          totalPrice: true,
        },
      },
    },
    orderBy: { saleDate: 'desc' },
  });

  const saleCommissions = saleEntries.map((e) => ({
    id:               e.id,
    date:             e.saleDate,
    clientName:       `${e.appointment.client.firstName} ${e.appointment.client.lastName}`.trim(),
    services:         e.appointment.services.map((s) => s.service.name).join(', '),
    saleTotal:        Number(e.appointment.totalPrice),
    commissionType:   'PERCENTAGE',
    commissionBasis:  Number(e.commissionBasis),
    commissionAmount: Number(e.commissionAmount),
    status:           e.status,
  }));

  // Manual bonus entries (BONUS type PayrollEntry)
  type BonusRaw = { id: string; description: string | null; amount: object; entryStatus: string; createdAt: Date; commissionType?: string | null };
  const bonusEntries = await prisma.payrollEntry.findMany({
    where: {
      specialistId,
      type:      'BONUS',
      createdAt: { gte: fromDate, lte: toDate },
    },
    orderBy: { createdAt: 'desc' },
  }) as unknown as BonusRaw[];

  const bonuses = bonusEntries.map((b) => ({
    id:              b.id,
    commissionType:  b.commissionType ?? 'CUSTOM',
    label:           COMMISSION_TYPE_LABELS[b.commissionType ?? 'CUSTOM'] ?? 'Особый бонус',
    description:     b.description ?? '',
    amount:          Number(b.amount),
    entryStatus:     b.entryStatus,
    createdAt:       b.createdAt,
  }));

  const totalSaleCommissions = saleCommissions.reduce((s, c) => s + c.commissionAmount, 0);
  const totalBonuses         = bonuses.reduce((s, b) => s + b.amount, 0);

  return ok({
    saleCommissions,
    bonuses,
    summary: {
      totalSaleCommissions: Math.round(totalSaleCommissions * 100) / 100,
      totalBonuses:         Math.round(totalBonuses * 100) / 100,
      grandTotal:           Math.round((totalSaleCommissions + totalBonuses) * 100) / 100,
    },
  });
}
