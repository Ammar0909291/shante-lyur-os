export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { logAudit } from '@/lib/audit-logger';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }

// ─── GET /api/risk/alerts ─────────────────────────────────────────────────────
// Query: ?category=X&severity=X&dismissed=false&limit=50

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Risk alerts require admin access', 403);
  }

  const p          = req.nextUrl.searchParams;
  const category   = p.get('category') ?? undefined;
  const sevFilter  = p.get('severity') ?? undefined;
  const dismissed  = p.get('dismissed') === 'true';
  const limit      = Math.min(200, Number(p.get('limit') ?? '100'));

  try {
    const alerts = await prisma.riskAlert.findMany({
      where: {
        isDismissed: dismissed,
        ...(category  ? { category: category as never }  : {}),
        ...(sevFilter ? { severity: sevFilter as never } : {}),
      },
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
      take: limit,
    });

    return ok(alerts);
  } catch (err) {
    console.error('[risk/alerts GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch risk alerts', 500);
  }
}

// ─── PATCH /api/risk/alerts ───────────────────────────────────────────────────
// Body: { id: string, action: 'dismiss' | 'resolve' }

const PatchSchema = z.object({
  id:     z.string().uuid(),
  action: z.enum(['dismiss', 'resolve']),
});

export async function PATCH(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Only admins can manage risk alerts', 403);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid', 400);

  const { id, action } = parsed.data;

  try {
    const now = new Date();
    const updated = await prisma.riskAlert.update({
      where: { id },
      data: action === 'dismiss'
        ? { isDismissed: true, dismissedBy: userId!, dismissedAt: now }
        : { resolvedAt: now, isDismissed: true, dismissedBy: userId!, dismissedAt: now },
    });

    void logAudit({
      userId, role, action: 'UPDATE',
      entityType: 'RiskAlert', entityId: id,
      newValues: { action },
    });

    return ok(updated);
  } catch (err) {
    console.error('[risk/alerts PATCH]', err);
    return apiError('INTERNAL_ERROR', 'Failed to update alert', 500);
  }
}
