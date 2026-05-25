export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

const ALLOWED_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];
const MANAGE_ROLES   = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const UpdateSchema = z.object({
  status:        z.enum(['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'CANCELLED']).optional(),
  specialistId:  z.string().uuid().nullable().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferredTo:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes:         z.string().max(2000).optional(),
  expiresAt:     z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden();

  let body: unknown;
  try { body = await req.json(); } catch { return R.badRequest('Invalid JSON body'); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const exists = await prisma.waitlistEntry.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return R.notFound('Waitlist entry not found');

  const d = parsed.data;
  const data: Record<string, unknown> = {};

  if (d.status !== undefined) {
    data.status = d.status;
    if (d.status === 'NOTIFIED') data.notifiedAt = new Date();
  }
  if (d.specialistId !== undefined) data.specialistId = d.specialistId;
  if (d.preferredDate !== undefined) data.preferredDate = new Date(d.preferredDate);
  if (d.preferredFrom !== undefined) data.preferredFrom = parseTime(d.preferredFrom);
  if (d.preferredTo   !== undefined) data.preferredTo   = parseTime(d.preferredTo);
  if (d.notes         !== undefined) data.notes         = d.notes;
  if (d.expiresAt     !== undefined) data.expiresAt     = d.expiresAt ? new Date(d.expiresAt) : null;

  const entry = await prisma.waitlistEntry.update({
    where: { id: params.id },
    data,
    select: { id: true, status: true, notifiedAt: true },
  });

  return R.success({ id: entry.id, status: entry.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!MANAGE_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  const exists = await prisma.waitlistEntry.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return R.notFound('Waitlist entry not found');

  await prisma.waitlistEntry.delete({ where: { id: params.id } });
  return R.success({ deleted: true });
}

function parseTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(0);
  d.setUTCHours(h, m, 0, 0);
  return d;
}
