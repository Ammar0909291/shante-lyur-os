import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';
import { ForbiddenError } from '@domain/errors/forbidden-error';

interface JwtPayload {
  sub: string;
  role: string;
  type?: string;
  email?: string;
  jti?: string;
}

function getSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ??
    process.env.JWT_ACCESS_SECRET ??
    'dev-access-secret-change-me';
  return new TextEncoder().encode(secret);
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieToken = req.cookies.get('access_token')?.value;
  return cookieToken ?? null;
}

export async function verifyRequestAuth(
  req: NextRequest
): Promise<{ userId: string; role: string } | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as unknown as JwtPayload;

    if (!p.sub || !p.role) return null;
    if (p.type && p.type !== 'access') return null;

    return { userId: p.sub, role: p.role };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: NextRequest
): Promise<{ userId: string; role: string }> {
  const result = await verifyRequestAuth(req);
  if (!result) {
    throw new UnauthorizedError('Authentication required');
  }
  return result;
}

export async function requireRole(
  req: NextRequest,
  ...roles: string[]
): Promise<{ userId: string; role: string }> {
  const result = await requireAuth(req);
  if (!roles.includes(result.role)) {
    throw new ForbiddenError(
      `Required role: ${roles.join(' or ')}. Got: ${result.role}`
    );
  }
  return result;
}
