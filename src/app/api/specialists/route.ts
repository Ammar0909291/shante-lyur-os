export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  serviceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

// Shared mock fallback
const MOCK_SPECIALIST_ITEMS = [
  { id: 's1', userId: '', name: 'Наталья Владимирова', specialistType: 'MASSAGE_THERAPIST', specialization: 'Тайский массаж, Ароматерапевтический', specializations: ['Тайский массаж', 'Ароматерапевтический'], bio: '', rating: 4.9, reviewCount: 32, experienceYears: 7, color: '#6366f1', status: 'ACTIVE' },
  { id: 's2', userId: '', name: 'Ольга Козлова',      specialistType: 'MASSAGE_THERAPIST', specialization: 'Спортивный, Нейромышечный', specializations: ['Спортивный', 'Нейромышечный'], bio: '', rating: 4.8, reviewCount: 28, experienceYears: 5, color: '#8b5cf6', status: 'ACTIVE' },
  { id: 's3', userId: '', name: 'Дарья Соколова',     specialistType: 'MASSAGE_THERAPIST', specialization: 'Горячий камень, Антицеллюлитный', specializations: ['Горячий камень', 'Антицеллюлитный'], bio: '', rating: 4.7, reviewCount: 19, experienceYears: 4, color: '#06b6d4', status: 'ACTIVE' },
  { id: 's4', userId: '', name: 'Мария Волкова',      specialistType: 'COSMETOLOGIST',     specialization: 'Биоревитализация, Гиалуроновый лифтинг', specializations: ['Биоревитализация', 'Гиалуроновый лифтинг'], bio: '', rating: 4.6, reviewCount: 41, experienceYears: 6, color: '#f59e0b', status: 'ACTIVE' },
  { id: 's5', userId: '', name: 'Ирина Соколова',     specialistType: 'COSMETOLOGIST',     specialization: 'Химический пилинг, Аппаратная косметология', specializations: ['Химический пилинг', 'Аппаратная косметология'], bio: '', rating: 4.8, reviewCount: 55, experienceYears: 9, color: '#10b981', status: 'ACTIVE' },
];

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  params.forEach((v, k) => { raw[k] = v; });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400);
  }

  const { page, limit, search, serviceId, locationId } = parsed.data;

  try {
    const { prisma } = await import('@/infrastructure/config/prisma-client');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: 'ACTIVE' };

    if (search) {
      const q = search.trim();
      where.OR = [
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName:  { contains: q, mode: 'insensitive' } } },
        { specialization: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (serviceId) where.services = { some: { serviceId } };
    if (locationId) where.workingSchedules = { some: { locationId } };

    const [raws, total] = await Promise.all([
      prisma.specialist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: { user: true },
      }),
      prisma.specialist.count({ where }),
    ]);

    const items = raws.map(s => ({
      id: s.id,
      userId: s.userId,
      name: `${s.user.firstName} ${s.user.lastName}`.trim() || s.user.email,
      specialistType: s.specialistType,
      specialization: s.specialization ?? '',
      specializations: s.specialization
        ? s.specialization.split(',').map(x => x.trim()).filter(Boolean)
        : [],
      bio: s.bio ?? '',
      rating: s.rating ? Number(s.rating) : undefined,
      reviewCount: s.reviewCount,
      experienceYears: s.experienceYears ?? undefined,
      color: s.color ?? undefined,
      status: s.status,
    }));

    return ok({ items, total });
  } catch (err) {
    // DB unavailable — serve mock data filtered by search
    console.debug('[specialists] DB unavailable, mock fallback:', (err as Error).message);
    const q = (search ?? '').toLowerCase();
    const items = q
      ? MOCK_SPECIALIST_ITEMS.filter(s =>
          s.name.toLowerCase().includes(q) || s.specialization.toLowerCase().includes(q)
        )
      : MOCK_SPECIALIST_ITEMS;
    return ok({ items, total: items.length });
  }
}
