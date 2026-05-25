export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { calculateCommission } from '@/lib/commission';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const PatchSchema = z.object({
  commissionType:   z.enum(['FIXED','PERCENTAGE','BONUS']).optional(),
  commissionBasis:  z.number().min(0).optional(),
  commissionAmount: z.number().min(0).optional(),
  status:           z.enum(['PENDING','APPROVED','PAID']).optional(),
  notes:            z.string().max(2000).optional(),
  recalculate:      z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  let body: unknown;
  try { body = await req.json(); } catch { return err('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const entry = await prisma.saleCommissionEntry.findUnique({ where: { id: params.id } });
  if (!entry) return err('NOT_FOUND', 'Payroll entry not found', 404);

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (d.status !== undefined)           updateData.status = d.status;
  if (d.notes  !== undefined)           updateData.notes  = d.notes;

  if (d.commissionAmount !== undefined && !d.recalculate) {
    // Direct amount edit — mark as manually edited
    updateData.commissionAmount = d.commissionAmount;
    updateData.isManuallyEdited = true;
  }

  if (d.commissionType !== undefined)  updateData.commissionType  = d.commissionType;
  if (d.commissionBasis !== undefined) updateData.commissionBasis = d.commissionBasis;

  // Recalculate from type/basis (only if not manually edited, or explicitly forced)
  if (d.recalculate) {
    const apt = await prisma.appointment.findUnique({
      where: { id: entry.appointmentId },
      select: { totalPrice: true },
    });
    const commission = await calculateCommission(
      entry.userId,
      Number(apt?.totalPrice ?? 0),
      entry.roleOnSale,
    );
    updateData.commissionType   = commission.commissionType;
    updateData.commissionBasis  = commission.commissionBasis;
    updateData.commissionAmount = commission.commissionAmount;
    updateData.isManuallyEdited = false;
  } else if (
    !entry.isManuallyEdited &&
    (d.commissionType !== undefined || d.commissionBasis !== undefined) &&
    d.commissionAmount === undefined
  ) {
    // type or basis changed, auto-recalculate amount
    const type  = (d.commissionType  ?? entry.commissionType)  as 'FIXED' | 'PERCENTAGE' | 'BONUS';
    const basis = d.commissionBasis  ?? Number(entry.commissionBasis);
    const apt   = await prisma.appointment.findUnique({
      where: { id: entry.appointmentId },
      select: { totalPrice: true },
    });
    const total = Number(apt?.totalPrice ?? 0);
    updateData.commissionAmount =
      type === 'FIXED' ? basis :
      type === 'PERCENTAGE' ? Math.round(total * (basis / 100) * 100) / 100 : 0;
  }

  const updated = await prisma.saleCommissionEntry.update({
    where: { id: params.id },
    data:  updateData,
  });

  return ok({ id: updated.id, commissionAmount: Number(updated.commissionAmount), isManuallyEdited: updated.isManuallyEdited });
}
