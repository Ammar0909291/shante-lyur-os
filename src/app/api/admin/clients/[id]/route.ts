export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: { message } }, { status });
}

const PatchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, role: 'CLIENT' },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
  });
  if (!user) return apiError('Client not found', 404);
  return ok(user);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.user.findFirst({ where: { id, role: 'CLIENT' } });
  if (!existing) return apiError('Client not found', 404);

  const body: unknown = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid request body', 400);

  const { notes, ...userFields } = parsed.data;

  const updated = await prisma.user.update({
    where: { id },
    data: userFields,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
  });

  if (notes !== undefined) {
    await prisma.customerProfile.upsert({
      where: { userId: id },
      create: { userId: id, notes },
      update: { notes },
    });
  }

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.user.findFirst({ where: { id, role: 'CLIENT' } });
  if (!existing) return apiError('Client not found', 404);

  // Soft-delete: mark as SUSPENDED, preserving all history
  await prisma.user.update({
    where: { id },
    data: { status: 'SUSPENDED' },
  });

  return ok({ id, archived: true });
}
