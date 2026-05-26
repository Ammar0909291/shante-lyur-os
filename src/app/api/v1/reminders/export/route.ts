export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import * as XLSX from 'xlsx';

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? '';
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) return err('Forbidden', 403);

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: now, lte: in48h },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: {
      client: { select: { firstName: true, lastName: true, email: true } },
      specialist: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      services: { include: { service: { select: { name: true } } } },
      room: { select: { name: true } },
    },
    orderBy: { startAt: 'asc' },
  });

  const rows = appointments.map((a) => {
    const hoursUntil = Math.round((a.startAt.getTime() - now.getTime()) / 3_600_000 * 10) / 10;
    const window = hoursUntil <= 2 ? '2ч' : hoursUntil <= 24 ? '24ч' : '48ч';
    return {
      'Дата и время': a.startAt.toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' }),
      'Клиент': `${a.client.firstName} ${a.client.lastName}`,
      'Email': a.client.email ?? '',
      'Специалист': `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
      'Процедуры': a.services.map((s) => s.service.name).join(', '),
      'Кабинет': (a.room as { name?: string } | null)?.name ?? '',
      'Длительность (мин)': a.totalDuration,
      'Сумма (₽)': Number(a.totalPrice),
      'Статус брони': a.status,
      'Окно напоминания': window,
      'Часов до визита': hoursUntil,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 }, { wch: 22 }, { wch: 28 }, { wch: 22 },
    { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Напоминания');

  const rawBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as ArrayBuffer;

  return new NextResponse(rawBuf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reminders-${now.toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
