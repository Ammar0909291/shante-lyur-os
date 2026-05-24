export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiErr(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const PatchSchema = z.object({
  requestType: z.enum(['leave', 'schedule', 'service']),
  status:      z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(500).optional(),
});

interface RouteContext { params: Promise<{ id: string }> }

// Specialist request models pending schema migration — stub until schema is applied.
export async function PATCH(req: NextRequest, context: RouteContext) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return apiErr('UNAUTHORIZED', 'Authentication required', 401);
  if (!ADMIN_ROLES.includes(role)) return apiErr('FORBIDDEN', 'Admin access required', 403);

  const { id } = await context.params;
  let body: unknown;
  try { body = await req.json(); } catch { return apiErr('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiErr('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid', 400);

  return ok({ id, ...parsed.data, status: 'NOT_IMPLEMENTED' });
}
