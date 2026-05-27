export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

const bodySchema = z.object({
  salaryType: z.enum(['FIXED', 'HOURLY', 'SHIFT', 'HYBRID']),
  fixedAmount: z.number().min(0).default(0),
  hourlyRate: z.number().min(0).default(0),
  shiftRate: z.number().min(0).default(0),
  commissionRate: z.number().min(0).max(1).default(0),
  bonusThresholdSessions: z.number().int().min(1).nullable().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  const { id } = params;

  const specialist = await prisma.specialist.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!specialist) return R.notFound('Specialist not found');

  const config = await prisma.specialistSalaryConfig.findUnique({
    where: { specialistId: id },
  });

  if (!config) {
    return R.success(null);
  }

  return R.success({
    id: config.id,
    specialistId: config.specialistId,
    salaryType: config.salaryType,
    fixedAmount: r2(Number(config.fixedAmount)),
    hourlyRate: r2(Number(config.hourlyRate)),
    shiftRate: r2(Number(config.shiftRate)),
    commissionRate: Number(config.commissionRate),
    bonusThresholdSessions: config.bonusThresholdSessions,
    effectiveFrom: config.effectiveFrom,
    notes: config.notes ?? null,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ADMIN_ROLES.includes(role)) return R.forbidden('Requires Admin role or above');

  const { id } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Validation failed', parsed.error.flatten());

  const {
    salaryType,
    fixedAmount,
    hourlyRate,
    shiftRate,
    commissionRate,
    bonusThresholdSessions,
    notes,
  } = parsed.data;

  const specialist = await prisma.specialist.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!specialist) return R.notFound('Specialist not found');

  const config = await prisma.specialistSalaryConfig.upsert({
    where: { specialistId: id },
    update: {
      salaryType,
      fixedAmount,
      hourlyRate,
      shiftRate,
      commissionRate,
      bonusThresholdSessions: bonusThresholdSessions ?? null,
      notes: notes ?? null,
    },
    create: {
      specialistId: id,
      salaryType,
      fixedAmount,
      hourlyRate,
      shiftRate,
      commissionRate,
      bonusThresholdSessions: bonusThresholdSessions ?? null,
      notes: notes ?? null,
    },
  });

  return R.success({
    id: config.id,
    specialistId: config.specialistId,
    salaryType: config.salaryType,
    fixedAmount: r2(Number(config.fixedAmount)),
    hourlyRate: r2(Number(config.hourlyRate)),
    shiftRate: r2(Number(config.shiftRate)),
    commissionRate: Number(config.commissionRate),
    bonusThresholdSessions: config.bonusThresholdSessions,
    effectiveFrom: config.effectiveFrom,
    notes: config.notes ?? null,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}
