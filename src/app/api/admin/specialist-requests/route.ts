export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiErr(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

// Specialist request models (leaveRequest, scheduleChangeRequest, capabilityRequest)
// are pending schema migration. Routes return empty stubs until schema is applied.

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return apiErr('UNAUTHORIZED', 'Authentication required', 401);
  if (!ADMIN_ROLES.includes(role)) return apiErr('FORBIDDEN', 'Admin access required', 403);

  return ok({ leave: [], schedule: [], service: [] });
}
