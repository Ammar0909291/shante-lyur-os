export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';
import { z } from 'zod';
import type { ServiceCategory } from '@/domain/enums';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ListServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum([
    'COSMETOLOGY', 'MASSAGE', 'INJECTION', 'LASER',
    'BODY_CONTOURING', 'HAIR_REMOVAL', 'FACIAL', 'OTHER',
  ]).optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((value, key) => { raw[key] = value; });

    const parsed = ListServicesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const result = await registry.serviceRepository.findMany({
      isActive: true,
      category: parsed.data.category as ServiceCategory | undefined,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
