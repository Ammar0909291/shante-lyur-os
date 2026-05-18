export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';
import { z } from 'zod';
import { randomUUID } from 'crypto';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const CreateRestrictionSchema = z.object({
  type: z.enum(['medical', 'pregnancy', 'medication', 'other']),
  description: z.string().min(1).max(2000),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const { id: profileId } = await context.params;
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const registry = DIRegistry.instance;
    const restrictions = await registry.restrictionRepository.findByProfile(profileId, activeOnly);
    return ok(restrictions);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const { id: profileId } = await context.params;
    const body: unknown = await req.json();
    const parsed = CreateRestrictionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400);
    }

    const registry = DIRegistry.instance;
    const restriction = await registry.restrictionRepository.create({
      id: randomUUID(),
      profileId,
      type: parsed.data.type,
      description: parsed.data.description,
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      isActive: parsed.data.isActive,
    });

    return ok(restriction, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
