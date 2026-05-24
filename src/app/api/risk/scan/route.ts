export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';
import { runRiskScan, persistRiskAlerts } from '@/lib/risk-engine';
import { logAudit } from '@/lib/audit-logger';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }

// ─── POST /api/risk/scan ──────────────────────────────────────────────────────
// Runs full risk scan and persists new alerts to DB.
// Body (optional): { days?: number }

export async function POST(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return apiError('FORBIDDEN', 'Risk scanning requires admin access', 403);
  }

  let days = 30;
  try {
    const body = await req.json() as { days?: unknown };
    if (typeof body.days === 'number') days = Math.min(90, Math.max(7, body.days));
  } catch { /* no body or invalid JSON — use default */ }

  try {
    const dashboard = await runRiskScan(days);
    const created   = await persistRiskAlerts(dashboard.signals);

    void logAudit({
      userId, role, action: 'CREATE',
      entityType: 'RiskScan', entityId: null,
      newValues: { days, signalCount: dashboard.signals.length, created, overallScore: dashboard.overallScore },
    });

    return ok({
      scannedAt:    dashboard.scannedAt,
      periodDays:   days,
      signalsFound: dashboard.signals.length,
      alertsCreated: created,
      overallScore:  dashboard.overallScore,
      riskLevel:     dashboard.riskLevel,
    });
  } catch (err) {
    console.error('[risk/scan POST]', err);
    return apiError('INTERNAL_ERROR', 'Failed to run risk scan', 500);
  }
}
