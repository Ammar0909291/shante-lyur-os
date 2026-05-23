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
  category: z.enum(['COSMETOLOGY', 'MASSAGE']).optional(),
  search: z.string().optional(),
});

// Mock fallback — basePrice in kopecks (rubles × 100) to match formatCurrency()
const MOCK_SERVICES = [
  // Massage
  { id: 'msv1',  name: 'Классический расслабляющий массаж', category: 'MASSAGE',     basePrice: 350000,  baseDuration: 60,  description: 'Глубокое расслабление мышц, снятие стресса' },
  { id: 'msv2',  name: 'Тайский массаж',                   category: 'MASSAGE',     basePrice: 750000,  baseDuration: 90,  description: 'Традиционные тайские техники' },
  { id: 'msv3',  name: 'Спортивный массаж',                category: 'MASSAGE',     basePrice: 550000,  baseDuration: 60,  description: 'Восстановление после нагрузок' },
  { id: 'msv4',  name: 'Антицеллюлитный массаж',           category: 'MASSAGE',     basePrice: 400000,  baseDuration: 45,  description: 'Коррекция фигуры, улучшение лимфодренажа' },
  { id: 'msv5',  name: 'Ароматерапевтический массаж',      category: 'MASSAGE',     basePrice: 600000,  baseDuration: 60,  description: 'Эфирные масла премиум-класса' },
  { id: 'msv6',  name: 'Горячий камень (стоун)',            category: 'MASSAGE',     basePrice: 950000,  baseDuration: 90,  description: 'Вулканические камни, глубокое прогревание' },
  { id: 'msv7',  name: 'Нейромышечный массаж',             category: 'MASSAGE',     basePrice: 700000,  baseDuration: 75,  description: 'Работа с триггерными точками' },
  { id: 'msv8',  name: 'Глубокотканный массаж',            category: 'MASSAGE',     basePrice: 850000,  baseDuration: 90,  description: 'Глубокие мышечные слои, хронические боли' },
  { id: 'msv9',  name: 'SPA-ритуал «Шанте Люр»',          category: 'MASSAGE',     basePrice: 1200000, baseDuration: 120, description: 'Полный SPA-ритуал с массажем и уходом' },
  { id: 'msv10', name: 'Лимфодренажный массаж',            category: 'MASSAGE',     basePrice: 650000,  baseDuration: 60,  description: 'Снятие отёков, детокс' },
  // Cosmetology
  { id: 'csv1',  name: 'Биоревитализация',                 category: 'COSMETOLOGY', basePrice: 1800000, baseDuration: 60,  description: 'Гиалуроновые инъекции, глубокое увлажнение' },
  { id: 'csv2',  name: 'Ботокс / Диспорт',                 category: 'COSMETOLOGY', basePrice: 2000000, baseDuration: 45,  description: 'Коррекция мимических морщин' },
  { id: 'csv3',  name: 'RF-лифтинг',                       category: 'COSMETOLOGY', basePrice: 1000000, baseDuration: 60,  description: 'Радиоволновое омоложение без инъекций' },
  { id: 'csv4',  name: 'Контурная пластика',               category: 'COSMETOLOGY', basePrice: 2500000, baseDuration: 60,  description: 'Филлеры на основе гиалуроновой кислоты' },
  { id: 'csv5',  name: 'Мезотерапия',                      category: 'COSMETOLOGY', basePrice: 1500000, baseDuration: 45,  description: 'Коктейльные инъекции для кожи' },
  { id: 'csv6',  name: 'PRP-терапия',                      category: 'COSMETOLOGY', basePrice: 2200000, baseDuration: 60,  description: 'Плазмолифтинг, обогащённая плазма' },
  { id: 'csv7',  name: 'Химический пилинг',                category: 'COSMETOLOGY', basePrice: 800000,  baseDuration: 45,  description: 'Обновление кожи, выравнивание тона' },
  { id: 'csv8',  name: 'Микронидлинг',                     category: 'COSMETOLOGY', basePrice: 1200000, baseDuration: 60,  description: 'Стимуляция выработки коллагена' },
  { id: 'csv9',  name: 'Гиалуроновый лифтинг',             category: 'COSMETOLOGY', basePrice: 1400000, baseDuration: 60,  description: 'Нитевой лифтинг без хирургии' },
  { id: 'csv10', name: 'Антивозрастной уход VIP',          category: 'COSMETOLOGY', basePrice: 3500000, baseDuration: 120, description: 'Комплексная программа омоложения' },
];

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  params.forEach((v, k) => { raw[k] = v; });

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400);
  }

  const { page, limit, category, search } = parsed.data;

  try {
    const { prisma } = await import('@/infrastructure/config/prisma-client');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [raws, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.service.count({ where }),
    ]);

    const items = raws.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description ?? '',
      // DB stores rubles as Decimal; multiply ×100 → kopecks for formatCurrency()
      basePrice: Math.round(Number(s.basePrice) * 100),
      baseDuration: s.baseDuration,
      isActive: s.isActive,
      requiresConsultation: s.requiresConsultation,
      sortOrder: s.sortOrder,
    }));

    return ok({ items, total });
  } catch (err) {
    console.debug('[services] DB unavailable, mock fallback:', (err as Error).message);
    const filtered = MOCK_SERVICES.filter(s => {
      if (category && s.category !== category) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const start = (page - 1) * limit;
    return ok({ items: filtered.slice(start, start + limit), total: filtered.length });
  }
}
