export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  const body = await req.json().catch(() => null);
  if (!body) return R.badRequest('Invalid JSON');

  const { specialistId, periodFrom, periodTo, hoursWorked } = body as {
    specialistId: string;
    periodFrom:   string;
    periodTo:     string;
    hoursWorked:  number;
  };

  if (!specialistId || !periodFrom || !periodTo || hoursWorked === undefined) {
    return R.badRequest('specialistId, periodFrom, periodTo, hoursWorked required');
  }
  if (typeof hoursWorked !== 'number' || hoursWorked < 0) {
    return R.badRequest('hoursWorked must be a non-negative number');
  }

  const from = new Date(periodFrom);
  const to   = new Date(periodTo);

  const entry = await prisma.payrollHoursEntry.upsert({
    where:  { specialistId_periodFrom_periodTo: { specialistId, periodFrom: from, periodTo: to } },
    update: { hoursWorked },
    create: { specialistId, periodFrom: from, periodTo: to, hoursWorked },
  });

  return R.success({ id: entry.id, hoursWorked: Number(entry.hoursWorked) });
}
