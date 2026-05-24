export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

// leaveRequest, scheduleChangeRequest, capabilityRequest models pending schema migration.
// Routes return stubs until the migration is applied.

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  return ok({ leave: [], schedule: [], service: [] });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? '';
  if (!userId) return err('UNAUTHORIZED', 'Authentication required', 401);
  if (!SPECIALIST_ROLES.includes(role)) return err('FORBIDDEN', 'Specialist access only', 403);

  return NextResponse.json(
    { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Specialist requests pending schema migration' } },
    { status: 501 },
  );
}
