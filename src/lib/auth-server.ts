import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  type: string;
}

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';

export function getCurrentUserId(req: NextRequest): string | null {
  const token = req.cookies.get('access_token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
    if (decoded.type !== 'access') return null;
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export function getCurrentUserRole(req: NextRequest): string | null {
  const token = req.cookies.get('access_token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
    if (decoded.type !== 'access') return null;
    return decoded.role ?? null;
  } catch {
    return null;
  }
}
