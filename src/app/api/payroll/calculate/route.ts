export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { calculatePayroll } from '@/lib/payroll-engine';
import { logAudit } from '@/lib/audit-logger';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

const Schema = z.object({
  specialistId: z.string().uuid(),
  periodStart:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  save:         z.boolean().default(false), // if true, upsert a PayrollRecord
});

// ─── POST /api/payroll/calculate ──────────────────────────────────────────────
// Calculate commission + salary for a specialist in a date range.
// Pass save=true to persist as a PayrollRecord (DRAFT status).

export async function POST(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body', 400);

  const { specialistId, periodStart: ps, periodEnd: pe, save } = parsed.data;
  const periodStart = new Date(ps + 'T00:00:00.000Z');
  const periodEnd   = new Date(pe + 'T23:59:59.999Z');

  if (periodStart > periodEnd) return apiError('BAD_REQUEST', 'periodStart must be before periodEnd', 400);

  try {
    const calc = await calculatePayroll(specialistId, periodStart, periodEnd);

    let record: { id: string; status: string } | null = null;

    if (save) {
      record = await prisma.payrollRecord.upsert({
        where:  { specialistId_periodStart_periodEnd: { specialistId, periodStart, periodEnd } },
        create: {
          specialistId,
          periodStart,
          periodEnd,
          compensationType: calc.compensationType as never,
          baseSalary:       calc.baseSalary,
          totalCommission:  calc.totalCommission,
          totalBonuses:     0,
          totalPenalties:   0,
          totalDeductions:  0,
          netPayable:       calc.netPayable,
          status:           'DRAFT',
          completedApts:    calc.completedApts,
          totalRevenue:     calc.totalRevenue,
          totalRefunded:    calc.totalRefunded,
          workingDays:      calc.workingDays,
          workedHours:      calc.workedHours,
          metadata:         { breakdown: calc.breakdown.length, workloadScore: calc.workloadScore },
          createdBy:        userId ?? '',
        },
        update: {
          compensationType: calc.compensationType as never,
          baseSalary:       calc.baseSalary,
          totalCommission:  calc.totalCommission,
          netPayable:       calc.netPayable,
          completedApts:    calc.completedApts,
          totalRevenue:     calc.totalRevenue,
          totalRefunded:    calc.totalRefunded,
          workingDays:      calc.workingDays,
          workedHours:      calc.workedHours,
          metadata:         { breakdown: calc.breakdown.length, workloadScore: calc.workloadScore },
        },
        select: { id: true, status: true },
      });

      void logAudit({
        userId, role,
        action: 'CREATE',
        entityType: 'PayrollRecord',
        entityId: record.id,
        newValues: { specialistId, periodStart: ps, periodEnd: pe, netPayable: calc.netPayable },
      });
    }

    return ok({
      ...calc,
      recordId: record?.id ?? null,
      recordStatus: record?.status ?? null,
      breakdown: calc.breakdown,
    }, save ? 201 : 200);
  } catch (err) {
    console.error('[payroll/calculate]', err);
    if (err instanceof Error && err.message.includes('not found')) {
      return apiError('NOT_FOUND', err.message, 404);
    }
    return apiError('INTERNAL_ERROR', 'Failed to calculate payroll', 500);
  }
}

// ─── GET /api/payroll/calculate?specialistId=X&from=Y&to=Z ───────────────────
// Quick preview without saving.

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p            = req.nextUrl.searchParams;
  const specialistId = p.get('specialistId') ?? '';
  const from         = p.get('from') ?? '';
  const to           = p.get('to') ?? '';

  if (!specialistId || !from || !to) {
    return apiError('BAD_REQUEST', 'specialistId, from and to are required', 400);
  }

  // Role restriction: specialists can only view their own payroll
  if (role === 'COSMETOLOGIST' || role === 'MASSAGIST') {
    const spec = await prisma.specialist.findFirst({
      where: { id: specialistId, userId: userId ?? '' },
      select: { id: true },
    });
    if (!spec) return apiError('FORBIDDEN', 'Cannot view another specialist payroll', 403);
  }

  try {
    const calc = await calculatePayroll(
      specialistId,
      new Date(from + 'T00:00:00.000Z'),
      new Date(to + 'T23:59:59.999Z'),
    );
    return ok(calc);
  } catch (err) {
    console.error('[payroll/calculate GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to calculate payroll', 500);
  }
}
