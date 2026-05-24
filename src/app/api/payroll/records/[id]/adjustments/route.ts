export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { logAudit } from '@/lib/audit-logger';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }

interface Ctx { params: Promise<{ id: string }> }

const Schema = z.object({
  type:          z.enum([
    'BONUS_REVENUE', 'BONUS_RETENTION', 'BONUS_PERFORMANCE', 'BONUS_PACKAGE_SALE',
    'BONUS_UPSELL', 'BONUS_TARGET_HIT', 'BONUS_MANUAL',
    'PENALTY_NO_SHOW', 'PENALTY_LATENESS', 'PENALTY_CANCELLATION', 'PENALTY_POLICY',
    'DEDUCTION_ADVANCE', 'DEDUCTION_OTHER', 'REFUND_REVERSAL',
  ]),
  amount:        z.number().refine(v => v !== 0, 'Amount cannot be 0'),
  reason:        z.string().max(500).optional(),
  appointmentId: z.string().uuid().optional(),
});

// ─── POST /api/payroll/records/[id]/adjustments ───────────────────────────────
// Add bonus, penalty, or deduction to a payroll record.
// Positive amount = credit (bonus). Negative = debit (penalty/deduction).

export async function POST(req: NextRequest, ctx: Ctx) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Only admins can add payroll adjustments', 403);
  }

  const { id: payrollId } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid', 400);

  const { type, amount, reason, appointmentId } = parsed.data;

  try {
    const record = await prisma.payrollRecord.findUnique({
      where: { id: payrollId },
      select: { id: true, status: true, totalBonuses: true, totalPenalties: true, totalDeductions: true, netPayable: true },
    });
    if (!record) return apiError('NOT_FOUND', 'Payroll record not found', 404);
    if (record.status === 'PAID' || record.status === 'CANCELLED') {
      return apiError('INVALID_STATE', `Cannot adjust a ${record.status} payroll record`, 400);
    }

    const isBonus    = amount > 0;
    const isPenalty  = type.startsWith('PENALTY');
    const isDeduct   = type.startsWith('DEDUCTION') || type === 'REFUND_REVERSAL';

    const adjustment = await prisma.$transaction(async (tx) => {
      const adj = await tx.payrollAdjustment.create({
        data: { payrollId, type: type as never, amount, reason: reason ?? null, appointmentId: appointmentId ?? null, createdBy: userId ?? '' },
        select: { id: true, type: true, amount: true, reason: true, createdAt: true },
      });

      // Recalculate record totals
      const bonusDelta     = isBonus && !isPenalty && !isDeduct ? amount : 0;
      const penaltyDelta   = isPenalty ? Math.abs(amount) : 0;
      const deductionDelta = isDeduct  ? Math.abs(amount) : 0;

      await tx.payrollRecord.update({
        where: { id: payrollId },
        data: {
          totalBonuses:    Number(record.totalBonuses) + bonusDelta,
          totalPenalties:  Number(record.totalPenalties) + penaltyDelta,
          totalDeductions: Number(record.totalDeductions) + deductionDelta,
          netPayable:      Number(record.netPayable) + amount,
        },
      });

      return adj;
    });

    void logAudit({
      userId, role, action: 'UPDATE',
      entityType: 'PayrollAdjustment', entityId: adjustment.id,
      newValues: { payrollId, type, amount, reason },
    });

    return ok({ id: adjustment.id, type: adjustment.type, amount: Number(adjustment.amount), reason: adjustment.reason, createdAt: adjustment.createdAt }, 201);
  } catch (err) {
    console.error('[payroll/adjustments POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to create adjustment', 500);
  }
}
