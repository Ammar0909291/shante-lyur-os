export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
        basePrice: true,
        baseDuration: true,
        description: true,
        requiresConsultation: true,
      },
    });

    const items = services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      basePrice: Number(s.basePrice),
      baseDuration: s.baseDuration,
      description: s.description,
      requiresConsultation: s.requiresConsultation,
    }));

    return ok(items);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
