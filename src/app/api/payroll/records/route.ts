export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }

// ─── GET /api/payroll/records ─────────────────────────────────────────────────
// Query: ?specialistId?&status?&from?&to?&page?&limit?

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const p            = req.nextUrl.searchParams;
  const status       = p.get('status');
  const from         = p.get('from');
  const to           = p.get('to');
  const page         = Math.max(1, Number(p.get('page') ?? '1'));
  const limit        = Math.min(100, Math.max(1, Number(p.get('limit') ?? '50')));

  // Specialists can only see their own records
  let specialistFilter: string | undefined = p.get('specialistId') ?? undefined;
  if (role === 'COSMETOLOGIST' || role === 'MASSAGIST') {
    const spec = await prisma.specialist.findFirst({
      where: { userId: userId ?? '' }, select: { id: true },
    });
    specialistFilter = spec?.id;
    if (!spec) return ok({ records: [], total: 0, page, limit, pages: 0 });
  }

  try {
    const where: Record<string, unknown> = {};
    if (specialistFilter) where.specialistId = specialistFilter;
    if (status) where.status = status;
    if (from || to) {
      const pStart: Record<string, Date> = {};
      if (from) pStart.gte = new Date(from);
      if (to)   pStart.lte = new Date(to);
      where.periodStart = pStart;
    }

    const [total, records] = await Promise.all([
      prisma.payrollRecord.count({ where }),
      prisma.payrollRecord.findMany({
        where,
        include: {
          specialist: { select: { user: { select: { firstName: true, lastName: true } } } },
          adjustments: { select: { id: true, type: true, amount: true, reason: true, createdAt: true } },
        },
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const mapped = records.map((r) => ({
      id:               r.id,
      specialistId:     r.specialistId,
      specialistName:   r.specialist.user ? `${r.specialist.user.firstName} ${r.specialist.user.lastName}` : 'Неизвестно',
      periodStart:      r.periodStart.toISOString().split('T')[0],
      periodEnd:        r.periodEnd.toISOString().split('T')[0],
      compensationType: r.compensationType,
      baseSalary:       Number(r.baseSalary),
      totalCommission:  Number(r.totalCommission),
      totalBonuses:     Number(r.totalBonuses),
      totalPenalties:   Number(r.totalPenalties),
      totalDeductions:  Number(r.totalDeductions),
      netPayable:       Number(r.netPayable),
      status:           r.status,
      completedApts:    r.completedApts,
      totalRevenue:     Number(r.totalRevenue),
      totalRefunded:    Number(r.totalRefunded),
      workingDays:      r.workingDays,
      workedHours:      r.workedHours ? Number(r.workedHours) : null,
      notes:            r.notes,
      approvedAt:       r.approvedAt,
      paidAt:           r.paidAt,
      createdAt:        r.createdAt,
      adjustments:      r.adjustments.map((a) => ({
        id: a.id, type: a.type, amount: Number(a.amount), reason: a.reason, createdAt: a.createdAt,
      })),
    }));

    return ok({ records: mapped, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[payroll/records GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch payroll records', 500);
  }
}
