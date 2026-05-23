export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const VALID_CATEGORIES = ['COSMETOLOGY', 'MASSAGE', 'INJECTION', 'LASER', 'BODY_CONTOURING', 'HAIR_REMOVAL', 'FACIAL', 'OTHER'] as const;

function mapService(s: {
  id: string; name: string; category: string; displayCategory: string | null;
  serviceCode: string | null; basePrice: { toString(): string }; baseDuration: number;
  description: string | null; requiresConsultation: boolean; isActive: boolean; sortOrder: number;
}) {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    displayCategory: s.displayCategory,
    serviceCode: s.serviceCode,
    basePrice: Number(s.basePrice),
    baseDuration: s.baseDuration,
    description: s.description,
    requiresConsultation: s.requiresConsultation,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
  };
}

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, category: true, displayCategory: true, serviceCode: true,
        basePrice: true, baseDuration: true, description: true,
        requiresConsultation: true, isActive: true, sortOrder: true,
      },
    });
    return ok(services.map(mapService));
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(VALID_CATEGORIES).default('OTHER'),
  displayCategory: z.string().max(255).optional(),
  basePrice: z.coerce.number().min(0),
  baseDuration: z.coerce.number().int().min(1).max(480),
  description: z.string().max(2000).optional(),
  requiresConsultation: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const PatchSchema = z.object({
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  name: z.string().min(1).max(255).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  displayCategory: z.string().max(255).nullable().optional(),
  baseDuration: z.coerce.number().int().min(1).max(480).optional(),
  description: z.string().max(2000).nullable().optional(),
  requiresConsultation: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request body', 400);

    const { randomUUID } = await import('crypto');
    const service = await prisma.service.create({
      data: { id: randomUUID(), ...parsed.data },
      select: {
        id: true, name: true, category: true, displayCategory: true, serviceCode: true,
        basePrice: true, baseDuration: true, description: true,
        requiresConsultation: true, isActive: true, sortOrder: true,
      },
    });

    return ok(mapService(service), 201);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return apiError('BAD_REQUEST', 'Missing id', 400);

    const body: unknown = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid body', 400);

    const service = await prisma.service.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true, name: true, category: true, displayCategory: true, serviceCode: true,
        basePrice: true, baseDuration: true, description: true,
        requiresConsultation: true, isActive: true, sortOrder: true,
      },
    });

    return ok(mapService(service));
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
