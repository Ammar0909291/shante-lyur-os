export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth-server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

const SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

function resolveUserId(req: NextRequest): string | null {
  // Cookie-based auth (works for all roles, not just admin)
  const fromCookie = getCurrentUserId(req);
  if (fromCookie) return fromCookie;
  // Fallback: x-user-id set by middleware for protected routes
  return req.headers.get('x-user-id');
}

export async function GET(req: NextRequest) {
  const userId = resolveUserId(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Not authenticated', 401);

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
    if (!user) return apiError('NOT_FOUND', 'User not found', 404);
    return ok(user);
  } catch {
    return apiError('INTERNAL_ERROR', 'Server error', 500);
  }
}

const PatchSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(7).max(30).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const userId = resolveUserId(req);
  if (!userId) return apiError('UNAUTHORIZED', 'Not authenticated', 401);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input', 400);

  const { firstName, lastName, phone } = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (phone !== undefined) updateData.phone = phone;

  if (Object.keys(updateData).length === 0) return apiError('VALIDATION_ERROR', 'Nothing to update', 400);

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: SELECT,
    });
    return ok(updated);
  } catch {
    return apiError('INTERNAL_ERROR', 'Server error', 500);
  }
}
