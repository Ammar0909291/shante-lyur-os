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

const CreateAllergySchema = z.object({
  allergen: z.string().min(1).max(255),
  severity: z.enum(['mild', 'moderate', 'severe']),
  reaction: z.string().max(1000).optional(),
  diagnosedAt: z.string().datetime().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const { id: profileId } = await context.params;
    const registry = DIRegistry.instance;

    const allergies = await registry.allergyRepository.findByProfile(profileId);
    return ok(allergies);
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
    const parsed = CreateAllergySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400);
    }

    const registry = DIRegistry.instance;
    const allergy = await registry.allergyRepository.create({
      id: randomUUID(),
      profileId,
      allergen: parsed.data.allergen,
      severity: parsed.data.severity,
      reaction: parsed.data.reaction ?? null,
      diagnosedAt: parsed.data.diagnosedAt ? new Date(parsed.data.diagnosedAt) : null,
    });

    return ok(allergy, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
