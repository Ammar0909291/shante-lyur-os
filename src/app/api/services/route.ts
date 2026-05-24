export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, ServiceCategory } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(['COSMETOLOGY', 'MASSAGE', 'INJECTION', 'LASER', 'BODY_CONTOURING', 'HAIR_REMOVAL', 'FACIAL', 'OTHER']).optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['COSMETOLOGY', 'MASSAGE', 'INJECTION', 'LASER', 'BODY_CONTOURING', 'HAIR_REMOVAL', 'FACIAL', 'OTHER']),
  basePrice: z.number().nonnegative(),
  baseDuration: z.number().int().positive(),
  requiresConsultation: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((v, k) => { raw[k] = v; });

    const parsed = ListSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query', 400, { issues: parsed.error.issues });
    }

    const { page, limit, category, search, isActive } = parsed.data;

    const where: Prisma.ServiceWhereInput = {};
    if (category) where.category = category as ServiceCategory;
    if (isActive !== undefined) where.isActive = isActive;
    else where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    const items = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      basePrice: Number(s.basePrice),
      baseDuration: s.baseDuration,
      requiresConsultation: s.requiresConsultation,
      isActive: s.isActive,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt,
    }));

    return ok({ items, total, page, limit });
  } catch (e) {
    if (e instanceof Error) return apiError('INTERNAL_ERROR', e.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues });
    }

    const { name, description, category, basePrice, baseDuration, requiresConsultation, isActive, sortOrder } = parsed.data;

    const service = await prisma.service.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description,
        category: category as ServiceCategory,
        basePrice,
        baseDuration,
        requiresConsultation,
        isActive,
        sortOrder,
      },
    });

    return ok({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      basePrice: Number(service.basePrice),
      baseDuration: service.baseDuration,
      requiresConsultation: service.requiresConsultation,
      isActive: service.isActive,
      sortOrder: service.sortOrder,
      createdAt: service.createdAt,
    }, 201);
  } catch (e) {
    if (e instanceof Error) return apiError('INTERNAL_ERROR', e.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
