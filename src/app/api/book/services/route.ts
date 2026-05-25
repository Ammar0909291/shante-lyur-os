export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
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
        description: true,
        category: true,
        basePrice: true,
        baseDuration: true,
        imageUrl: true,
      },
    });

    const data = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      basePrice: Number(s.basePrice),
      baseDuration: s.baseDuration,
      imageUrl: s.imageUrl,
    }));

    return ok(data);
  } catch {
    return apiError('INTERNAL_ERROR', 'Failed to fetch services', 500);
  }
}
