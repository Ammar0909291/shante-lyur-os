export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const serviceId = req.nextUrl.searchParams.get('serviceId');
    if (!serviceId) {
      return apiError('VALIDATION_ERROR', 'serviceId is required', 400);
    }

    const specialists = await prisma.specialist.findMany({
      where: {
        status: 'ACTIVE',
        services: { some: { serviceId } },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const data = specialists.map((s) => ({
      id: s.id,
      displayName: `${s.user.firstName} ${s.user.lastName}`,
      specialization: s.specialization,
      bio: s.bio,
    }));

    return ok(data);
  } catch {
    return apiError('INTERNAL_ERROR', 'Failed to fetch specialists', 500);
  }
}
