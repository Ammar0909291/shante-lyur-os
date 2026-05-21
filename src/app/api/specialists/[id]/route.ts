export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const PatchSchema = z.object({
  status: z.enum(['ACTIVE', 'ON_VACATION', 'INACTIVE', 'TERMINATED']).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body: unknown = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request body', 400);

    const specialist = await prisma.specialist.update({
      where: { id: params.id },
      data: parsed.data,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    return ok({
      id: specialist.id,
      status: specialist.status,
      firstName: specialist.user.firstName,
      lastName: specialist.user.lastName,
      email: specialist.user.email,
    });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const specialist = await prisma.specialist.findUniqueOrThrow({
      where: { id: params.id },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    return ok({
      id: specialist.id,
      status: specialist.status,
      firstName: specialist.user.firstName,
      lastName: specialist.user.lastName,
      email: specialist.user.email,
      specialization: specialist.specialization,
      bio: specialist.bio,
      experienceYears: specialist.experienceYears,
      rating: specialist.rating !== null ? Number(specialist.rating) : null,
      reviewCount: specialist.reviewCount,
      commissionRate: Number(specialist.commissionRate),
      color: specialist.color,
    });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
