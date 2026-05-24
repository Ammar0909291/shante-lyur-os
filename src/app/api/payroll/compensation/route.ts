export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { logAudit } from '@/lib/audit-logger';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }

const Schema = z.object({
  specialistId:    z.string().uuid(),
  type:            z.enum(['FIXED_SALARY', 'COMMISSION_ONLY', 'SALARY_PLUS_COMMISSION', 'HOURLY', 'PROCEDURE_BASED']),
  baseSalary:      z.number().min(0).optional(),
  hourlyRate:      z.number().min(0).optional(),
  procedureRate:   z.number().min(0).optional(),
  commissionRate:  z.number().min(0).max(1).optional(),
  serviceOverrides: z.record(z.object({
    type:  z.enum(['pct', 'fixed']),
    value: z.number().positive(),
  })).optional(),
  notes: z.string().max(500).optional(),
});

// ─── GET /api/payroll/compensation?specialistId=X ─────────────────────────────

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const specId = req.nextUrl.searchParams.get('specialistId') ?? undefined;

  try {
    if (specId) {
      const comp = await prisma.specialistCompensation.findUnique({
        where: { specialistId: specId },
        include: { specialist: { select: { commissionRate: true, user: { select: { firstName: true, lastName: true } } } } },
      });

      if (!comp) {
        // Return defaults from specialist table
        const spec = await prisma.specialist.findUnique({
          where: { id: specId },
          select: { id: true, commissionRate: true, user: { select: { firstName: true, lastName: true } } },
        });
        if (!spec) return apiError('NOT_FOUND', 'Specialist not found', 404);
        return ok({ specialistId: specId, type: 'COMMISSION_ONLY', baseSalary: 0, commissionRate: Number(spec.commissionRate), serviceOverrides: {}, notes: null });
      }

      return ok({
        id:              comp.id,
        specialistId:    comp.specialistId,
        specialistName:  comp.specialist.user ? `${comp.specialist.user.firstName} ${comp.specialist.user.lastName}` : '',
        type:            comp.type,
        baseSalary:      comp.baseSalary ? Number(comp.baseSalary) : 0,
        hourlyRate:      comp.hourlyRate ? Number(comp.hourlyRate) : null,
        procedureRate:   comp.procedureRate ? Number(comp.procedureRate) : null,
        commissionRate:  Number(comp.specialist.commissionRate),
        serviceOverrides: comp.serviceOverrides ?? {},
        notes:           comp.notes,
        effectiveFrom:   comp.effectiveFrom,
        updatedAt:       comp.updatedAt,
      });
    }

    // All specialists with compensation config
    const all = await prisma.specialist.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        commissionRate: true,
        user: { select: { firstName: true, lastName: true } },
        compensationConfig: true,
      },
      orderBy: { user: { firstName: 'asc' } },
    });

    return ok(all.map((s) => ({
      specialistId:  s.id,
      specialistName: s.user ? `${s.user.firstName} ${s.user.lastName}` : '',
      type:          s.compensationConfig?.type ?? 'COMMISSION_ONLY',
      baseSalary:    s.compensationConfig?.baseSalary ? Number(s.compensationConfig.baseSalary) : 0,
      commissionRate: Number(s.commissionRate),
      serviceOverrides: s.compensationConfig?.serviceOverrides ?? {},
    })));
  } catch (err) {
    console.error('[payroll/compensation GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch compensation config', 500);
  }
}

// ─── POST /api/payroll/compensation ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Only admins can set compensation', 403);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid', 400);

  const { specialistId, type, baseSalary, hourlyRate, procedureRate, commissionRate, serviceOverrides, notes } = parsed.data;

  try {
    const old = await prisma.specialistCompensation.findUnique({ where: { specialistId }, select: { type: true, baseSalary: true } });

    const comp = await prisma.$transaction(async (tx) => {
      const result = await tx.specialistCompensation.upsert({
        where:  { specialistId },
        create: {
          specialistId, type: type as never,
          baseSalary:    baseSalary ?? null,
          hourlyRate:    hourlyRate ?? null,
          procedureRate: procedureRate ?? null,
          serviceOverrides: serviceOverrides ? (serviceOverrides as unknown as never) : undefined,
          notes: notes ?? null,
        },
        update: {
          type: type as never,
          ...(baseSalary !== undefined    ? { baseSalary }    : {}),
          ...(hourlyRate !== undefined    ? { hourlyRate }    : {}),
          ...(procedureRate !== undefined ? { procedureRate } : {}),
          ...(serviceOverrides !== undefined ? { serviceOverrides: serviceOverrides as never } : {}),
          ...(notes !== undefined         ? { notes }         : {}),
        },
        select: { id: true, type: true, baseSalary: true, serviceOverrides: true, updatedAt: true },
      });

      // Sync commissionRate back to specialist table if provided
      if (commissionRate !== undefined) {
        await tx.specialist.update({ where: { id: specialistId }, data: { commissionRate } });
      }

      return result;
    });

    void logAudit({
      userId, role, action: 'UPDATE',
      entityType: 'SpecialistCompensation', entityId: comp.id,
      oldValues: old ? { type: old.type, baseSalary: old.baseSalary } : {},
      newValues: { type, baseSalary, commissionRate, serviceOverrides },
    });

    return ok(comp, 201);
  } catch (err) {
    console.error('[payroll/compensation POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to save compensation config', 500);
  }
}
