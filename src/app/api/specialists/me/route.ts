export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// Returns the specialist record for the authenticated user (if they are one).
// Used by client-side pages to obtain currentSpecialistId for note authorship.
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const registry = DIRegistry.instance;
    const specialist = await registry.specialistRepository.findByUserId(userId);
    if (!specialist) return apiError('NOT_FOUND', 'No specialist profile for this user', 404);

    return ok({
      id: specialist.id,
      specialization: specialist.specialization ?? null,
      color: specialist.color?.value ?? null,
    });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
