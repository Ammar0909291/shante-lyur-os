export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { runRiskScan } from '@/lib/risk-engine';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }

// ─── GET /api/risk/dashboard ──────────────────────────────────────────────────
// Query: ?days=30
// Returns live risk analysis — no DB writes.

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Risk dashboard requires admin access', 403);
  }

  const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get('days') ?? '30')));

  try {
    const dashboard = await runRiskScan(days);
    return ok(dashboard);
  } catch (err) {
    console.error('[risk/dashboard GET]', err);
    return apiError('INTERNAL_ERROR', 'Failed to generate risk dashboard', 500);
  }
}
