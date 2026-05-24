export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ??
    process.env.JWT_ACCESS_SECRET ??
    'dev-access-secret-change-me';
  return new TextEncoder().encode(secret);
}

interface AccessPayload {
  sub: string;
  role: string;
  type?: string;
}

export async function GET(req: NextRequest) {
  // Check headers first (set by middleware for protected routes)
  const headerUserId = req.headers.get('x-user-id');
  const headerRole   = req.headers.get('x-user-role');

  if (headerUserId && headerRole) {
    return NextResponse.json({
      success: true,
      data: { id: headerUserId, role: headerRole },
    });
  }

  // Self-validate JWT from cookie or Authorization header
  const authHeader = req.headers.get('Authorization');
  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ??
    req.cookies.get('access_token')?.value ??
    null;

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const p = payload as unknown as AccessPayload;
    if (!p.sub || !p.role) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: p.sub, role: p.role },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
      { status: 401 }
    );
  }
}
