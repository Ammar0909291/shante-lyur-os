export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { logAudit } from '@/lib/audit-logger';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }

interface Ctx { params: Promise<{ id: string }> }

const UpdateSchema = z.object({
  action: z.enum(['approve', 'pay', 'cancel', 'reopen']).optional(),
  notes:  z.string().max(1000).optional(),
});

// ─── GET /api/payroll/records/[id] ────────────────────────────────────────────

export async function GET(req: NextRequest, ctx: Ctx) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const { id } = await ctx.params;

  try {
    const record = await prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        specialist: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        adjustments: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, type: true, amount: true, reason: true, appointmentId: true, createdAt: true },
        },
      },
    });
    if (!record) return apiError('NOT_FOUND', 'Payroll record not found', 404);

    // Specialists can only view their own
    if (role === 'COSMETOLOGIST' || role === 'MASSAGIST') {
      const spec = await prisma.specialist.findFirst({ where: { userId: userId ?? '' }, select: { id: true } });
      if (spec?.id !== record.specialistId) return apiError('FORBIDDEN', 'Access denied', 403);
    }

    return ok({
      id:               record.id,
      specialistId:     record.specialistId,
      specialistName:   record.specialist.user ? `${record.specialist.user.firstName} ${record.specialist.user.lastName}` : '',
      periodStart:      record.periodStart.toISOString().split('T')[0],
      periodEnd:        record.periodEnd.toISOString().split('T')[0],
      compensationType: record.compensationType,
      baseSalary:       Number(record.baseSalary),
      totalCommission:  Number(record.totalCommission),
      totalBonuses:     Number(record.totalBonuses),
      totalPenalties:   Number(record.totalPenalties),
      totalDeductions:  Number(record.totalDeductions),
      netPayable:       Number(record.netPayable),
      status:           record.status,
      completedApts:    record.completedApts,
      totalRevenue:     Number(record.totalRevenue),
      totalRefunded:    Number(record.totalRefunded),
      workingDays:      record.workingDays,
      workedHours:      record.workedHours ? Number(record.workedHours) : null,
      notes:            record.notes,
      metadata:         record.metadata,
      approvedBy:       record.approvedBy,
      approvedAt:       record.approvedAt,
      paidAt:           record.paidAt,
      paidBy:           record.paidBy,
      createdAt:        record.createdAt,
      adjustments:      record.adjustments.map((a) => ({
        id: a.id, type: a.type, amount: Number(a.amount), reason: a.reason,
        appointmentId: a.appointmentId, createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error('[payroll/records/id GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch record', 500);
  }
}

// ─── PATCH /api/payroll/records/[id] ─────────────────────────────────────────
// Supports: approve, pay, cancel, reopen actions + notes update.

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  // Only admins can change payroll status
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Only admins can modify payroll records', 403);
  }

  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid', 400);

  const { action, notes } = parsed.data;

  try {
    const record = await prisma.payrollRecord.findUnique({ where: { id }, select: { id: true, status: true, specialistId: true } });
    if (!record) return apiError('NOT_FOUND', 'Payroll record not found', 404);

    const statusMap: Record<string, { from: string[]; to: string }> = {
      approve:  { from: ['DRAFT', 'PENDING_APPROVAL'], to: 'APPROVED' },
      pay:      { from: ['APPROVED'], to: 'PAID' },
      cancel:   { from: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'], to: 'CANCELLED' },
      reopen:   { from: ['CANCELLED', 'APPROVED'], to: 'DRAFT' },
    };

    const updateData: Record<string, unknown> = {};
    if (action) {
      const trans = statusMap[action];
      if (!trans?.from.includes(record.status)) {
        return apiError('INVALID_STATE', `Cannot '${action}' a ${record.status} record`, 400);
      }
      updateData.status = trans.to;
      if (action === 'approve') { updateData.approvedBy = userId; updateData.approvedAt = new Date(); }
      if (action === 'pay')     { updateData.paidBy = userId;     updateData.paidAt = new Date(); }
    }
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.payrollRecord.update({
      where: { id },
      data:  updateData,
      select: { id: true, status: true, approvedAt: true, paidAt: true },
    });

    void logAudit({
      userId, role, action: 'UPDATE',
      entityType: 'PayrollRecord', entityId: id,
      oldValues: { status: record.status },
      newValues: { action, status: updated.status },
    });

    return ok(updated);
  } catch (err) {
    console.error('[payroll/records/id PATCH]', err);
    return apiError('INTERNAL_ERROR', 'Failed to update record', 500);
  }
}
