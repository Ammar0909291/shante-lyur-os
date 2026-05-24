export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth-server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

async function resolveUser(req: NextRequest) {
  const userId = getCurrentUserId(req);
  if (userId) return userId;
  // Dev fallback: first admin
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  return admin?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUser(req);
  if (!userId) return apiError('Unauthorized', 401);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!user) return apiError('User not found', 404);
  return ok(user);
}

const patchSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(7).max(30).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const userId = await resolveUser(req);
  if (!userId) return apiError('Unauthorized', 401);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError('Invalid JSON'); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? 'Invalid input');

  const { firstName, lastName, phone } = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (phone !== undefined) updateData.phone = phone;

  if (Object.keys(updateData).length === 0) return apiError('Nothing to update');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: SELECT,
  });
  return ok(updated);
}
