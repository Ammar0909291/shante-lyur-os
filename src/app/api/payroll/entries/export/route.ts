export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import * as XLSX from 'xlsx';

function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  const params = req.nextUrl.searchParams;
  const userId = params.get('userId');
  if (!userId) return err('VALIDATION_ERROR', 'userId required', 400);

  const from = params.get('from') ? new Date(params.get('from')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to   = params.get('to')   ? new Date(params.get('to')!)   : new Date();

  const [entries, adjustments, user] = await Promise.all([
    prisma.saleCommissionEntry.findMany({
      where: { userId, saleDate: { gte: from, lte: to } },
      include: {
        appointment: {
          select: {
            totalPrice: true,
            clientTypeAtSale: true,
            client: { select: { firstName: true, lastName: true } },
            services: { select: { service: { select: { name: true } } } },
          },
        },
      },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.periodAdjustment.findMany({
      where: { userId, periodStart: { gte: from }, periodEnd: { lte: to } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, role: true },
    }),
  ]);

  const name = user ? `${user.firstName} ${user.lastName}` : userId;

  const entriesRows = entries.map((e) => ({
    'Дата':            e.saleDate.toLocaleDateString('ru-RU'),
    'Клиент':          e.appointment.client
                         ? `${e.appointment.client.firstName} ${e.appointment.client.lastName[0]}.`
                         : '—',
    'Услуги':          e.appointment.services.map((s) => s.service.name).join(', '),
    'Тип клиента':     e.appointment.clientTypeAtSale ?? 'RETURNING',
    'Сумма продажи':   Number(e.appointment.totalPrice),
    'Роль':            e.roleOnSale,
    'Тип комиссии':    e.commissionType,
    'База':            Number(e.commissionBasis),
    'Комиссия (₽)':   Number(e.commissionAmount),
    'Ручная правка':   e.isManuallyEdited ? 'Да' : 'Нет',
    'Статус':          e.status,
    'Примечание':      e.notes ?? '',
  }));

  const adjRows = adjustments.map((a) => ({
    'Дата':          a.createdAt.toLocaleDateString('ru-RU'),
    'Описание':      a.description,
    'Сумма':         Number(a.amount),
  }));

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(entriesRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Комиссии');

  if (adjRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(adjRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Корректировки');
  }

  // Summary row
  const totalComm   = entries.reduce((s, e) => s + Number(e.commissionAmount), 0);
  const totalAdj    = adjustments.reduce((s, a) => s + Number(a.amount), 0);
  const summaryRows = [
    { 'Показатель': 'Сотрудник',    'Значение': name },
    { 'Показатель': 'Период с',     'Значение': from.toLocaleDateString('ru-RU') },
    { 'Показатель': 'Период по',    'Значение': to.toLocaleDateString('ru-RU') },
    { 'Показатель': 'Продажи (шт)', 'Значение': entries.length },
    { 'Показатель': 'Комиссия итого', 'Значение': Math.round(totalComm * 100) / 100 },
    { 'Показатель': 'Корректировки', 'Значение': Math.round(totalAdj * 100) / 100 },
    { 'Показатель': 'К выплате',    'Значение': Math.round((totalComm + totalAdj) * 100) / 100 },
  ];
  const ws3 = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Сводка');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const safeName = name.replace(/[^\wа-яёА-ЯЁ\s]/gi, '').replace(/\s+/g, '_');
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="payroll_${safeName}_${from.toISOString().split('T')[0]}.xlsx"`,
    },
  });
}
