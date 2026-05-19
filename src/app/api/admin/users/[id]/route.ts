export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ADMIN_ROLES } from '@/lib/admin-roles';
import { NotFoundError, DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

type RouteContext = { params: { id: string } };

// Hard-delete a user that has no associated records (used to clean up orphaned users
// when specialist profile creation fails after the user account was created).
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const registry = DIRegistry.instance;
    const user = await registry.userRepository.findById(params.id);
    if (!user) throw new NotFoundError('User', params.id);

    // Safety: only allow deletion of users with no specialist profile
    const specialist = await registry.specialistRepository.findByUserId(params.id);
    if (specialist) {
      return apiError('CONFLICT', 'Cannot delete user that has a specialist profile', 409);
    }

    await registry.userRepository.delete(params.id);
    return ok({ id: params.id });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
