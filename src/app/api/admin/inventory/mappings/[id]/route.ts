export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const PatchSchema = z.object({
  quantityPerUse: z.number().positive(),
});

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const link = await prisma.inventoryServiceLink.findUnique({ where: { id } });
    if (!link) return apiError('NOT_FOUND', 'Mapping not found', 404);

    const body: unknown = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid body', 400);

    const updated = await prisma.inventoryServiceLink.update({
      where: { id },
      data: { quantityPerUse: parsed.data.quantityPerUse },
    });

    return ok({ id: updated.id, quantityPerUse: Number(updated.quantityPerUse) });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const link = await prisma.inventoryServiceLink.findUnique({ where: { id } });
    if (!link) return apiError('NOT_FOUND', 'Mapping not found', 404);

    await prisma.inventoryServiceLink.delete({ where: { id } });
    return ok({ id, deleted: true });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
