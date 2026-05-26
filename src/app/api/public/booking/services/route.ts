export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

export async function GET(req: NextRequest) {
  const specialistId = req.nextUrl.searchParams.get('specialistId');
  if (!specialistId) return err('specialistId is required');

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { id: true },
  });
  if (!specialist) return err('Specialist not found', 404);

  const links = await prisma.specialistService.findMany({
    where: { specialistId, isActive: true },
    select: {
      priceOverride: true,
      durationOverride: true,
      service: {
        select: { id: true, name: true, baseDuration: true, basePrice: true, category: true },
      },
    },
    orderBy: { service: { sortOrder: 'asc' } },
  });

  const services = links.map((l) => ({
    id: l.service.id,
    name: l.service.name,
    duration: l.durationOverride ?? l.service.baseDuration,
    price: Number(l.priceOverride ?? l.service.basePrice),
    category: l.service.category,
  }));

  return ok({ services });
}
