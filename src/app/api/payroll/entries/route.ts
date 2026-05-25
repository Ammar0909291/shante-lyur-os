export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  const params  = req.nextUrl.searchParams;
  const userId  = params.get('userId') ?? actorId;
  const from    = params.get('from') ? new Date(params.get('from')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to      = params.get('to')   ? new Date(params.get('to')!)   : new Date();

  const entries = await prisma.saleCommissionEntry.findMany({
    where: {
      userId,
      saleDate: { gte: from, lte: to },
    },
    include: {
      appointment: {
        select: {
          id: true,
          totalPrice: true,
          startAt: true,
          clientTypeAtSale: true,
          client: { select: { firstName: true, lastName: true } },
          services: {
            select: { service: { select: { name: true } }, performedBySpecialistId: true },
          },
        },
      },
    },
    orderBy: { saleDate: 'asc' },
  });

  const rows = entries.map((e) => {
    const apt  = e.appointment;
    const clientName = apt.client
      ? `${apt.client.firstName} ${apt.client.lastName[0] ?? ''}.`
      : '—';
    const services = apt.services.map((s) => s.service.name).join(', ');
    return {
      id:               e.id,
      saleDate:         e.saleDate.toISOString(),
      clientName,
      services,
      clientType:       apt.clientTypeAtSale ?? 'RETURNING',
      saleTotal:        Number(apt.totalPrice),
      roleOnSale:       e.roleOnSale,
      commissionType:   e.commissionType,
      commissionBasis:  Number(e.commissionBasis),
      commissionAmount: Number(e.commissionAmount),
      isManuallyEdited: e.isManuallyEdited,
      status:           e.status,
      notes:            e.notes ?? '',
      appointmentId:    e.appointmentId,
    };
  });

  const totalCommission = rows.reduce((s, r) => s + r.commissionAmount, 0);

  return ok({ entries: rows, totalCommission: Math.round(totalCommission * 100) / 100 });
}
