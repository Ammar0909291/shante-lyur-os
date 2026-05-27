/**
 * Per-user permission overrides — SUPER_ADMIN only.
 *
 * GET  /api/v1/admin/users/:id/permissions
 *   → returns the list of granted resources for the user
 *
 * POST /api/v1/admin/users/:id/permissions
 *   body: { resource: string; note?: string }
 *   → grants access to the resource for the user
 *
 * DELETE /api/v1/admin/users/:id/permissions
 *   body: { resource: string }
 *   → revokes the override for the resource
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { requireSuperAdmin } from '@/lib/rbac';

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function fail(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}

function getCaller(req: NextRequest) {
  return {
    userId: req.headers.get('x-user-id') ?? null,
    role:   req.headers.get('x-user-role') ?? '',
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId, role } = getCaller(req);
  const guard = requireSuperAdmin(userId, role);
  if (guard) return guard;

  const { id } = params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });
  if (!target) return fail('NOT_FOUND', 'User not found', 404);

  const overrides = await prisma.userPermissionOverride.findMany({
    where: { userId: id },
    orderBy: { grantedAt: 'desc' },
    select: {
      id: true,
      resource: true,
      grantedAt: true,
      note: true,
      grantedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return ok({ user: target, grants: overrides });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const PostSchema = z.object({
  resource: z.string().min(1).max(120),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId, role } = getCaller(req);
  const guard = requireSuperAdmin(userId, role);
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid request body', 400);

  const { id } = params;
  const { resource, note } = parsed.data;

  // SUPER_ADMIN cannot grant themselves anything (no-op / guard)
  if (id === userId) return fail('FORBIDDEN', 'Cannot grant permissions to yourself', 403);

  // Target user must exist and not be SUPER_ADMIN
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return fail('NOT_FOUND', 'User not found', 404);
  if (target.role === 'SUPER_ADMIN') return fail('FORBIDDEN', 'Cannot modify SUPER_ADMIN permissions', 403);

  const override = await prisma.userPermissionOverride.upsert({
    where: { userId_resource: { userId: id, resource } },
    update: { note: note ?? null, grantedById: userId!, grantedAt: new Date() },
    create: { userId: id, resource, grantedById: userId!, note: note ?? null },
    select: { id: true, resource: true, grantedAt: true, note: true },
  });

  return ok({ grant: override });
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

const DeleteSchema = z.object({
  resource: z.string().min(1).max(120),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId, role } = getCaller(req);
  const guard = requireSuperAdmin(userId, role);
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid request body', 400);

  const { id } = params;
  const { resource } = parsed.data;

  const existing = await prisma.userPermissionOverride.findUnique({
    where: { userId_resource: { userId: id, resource } },
  });
  if (!existing) return fail('NOT_FOUND', 'Grant not found', 404);

  await prisma.userPermissionOverride.delete({
    where: { userId_resource: { userId: id, resource } },
  });

  return ok({ revoked: true, resource });
}
