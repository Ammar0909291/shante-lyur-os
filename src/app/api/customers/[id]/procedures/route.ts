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

const CreateProcedureSchema = z.object({
  appointmentId: z.string().uuid(),
  serviceId: z.string().uuid(),
  specialistId: z.string().uuid(),
  performedAt: z.string().datetime(),
  results: z.string().max(4000).optional(),
  sideEffects: z.string().max(2000).optional(),
  clientFeedback: z.string().max(2000).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().datetime().optional(),
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

    const procedures = await registry.procedureHistoryRepository.findByProfile(profileId);
    return ok(procedures);
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
    const parsed = CreateProcedureSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400);
    }

    const registry = DIRegistry.instance;
    const procedure = await registry.procedureHistoryRepository.create({
      id: randomUUID(),
      profileId,
      appointmentId: parsed.data.appointmentId,
      serviceId: parsed.data.serviceId,
      specialistId: parsed.data.specialistId,
      performedAt: new Date(parsed.data.performedAt),
      results: parsed.data.results ?? null,
      sideEffects: parsed.data.sideEffects ?? null,
      clientFeedback: parsed.data.clientFeedback ?? null,
      followUpRequired: parsed.data.followUpRequired,
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
    });

    return ok(procedure, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
