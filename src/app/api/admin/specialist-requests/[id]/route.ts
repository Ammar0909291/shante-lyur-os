export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const PatchSchema = z.object({
  requestType: z.enum(['leave', 'schedule', 'service']),
  status:      z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(500).optional(),
});

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!ADMIN_ROLES.includes(role)) return err('FORBIDDEN', 'Admin access required', 403);

  const { id } = await context.params;
  let body: unknown;
  try { body = await req.json(); } catch { return err('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid', 400);

  const { requestType, status, reviewNotes } = parsed.data;
  const updateData = { status, reviewedBy: userId, ...(reviewNotes ? { reviewNotes } : {}) };

  if (requestType === 'leave') {
    const r = await prisma.leaveRequest.update({ where: { id }, data: updateData });
    return ok(r);
  }
  if (requestType === 'schedule') {
    const r = await prisma.scheduleChangeRequest.update({ where: { id }, data: updateData });
    return ok(r);
  }
  const r = await prisma.capabilityRequest.update({ where: { id }, data: updateData });
  return ok(r);
}
