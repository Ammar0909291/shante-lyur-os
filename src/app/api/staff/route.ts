export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';
import { UserRole, UserStatus } from '@/domain/enums';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// Returns active staff members (all roles except CLIENT) for recipient selection
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role   = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (role === UserRole.CLIENT) return apiError('FORBIDDEN', 'Insufficient permissions', 403);

    const registry = DIRegistry.instance;

    // Fetch all active staff roles in parallel
    const roles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.SPECIALIST];
    const results = await Promise.all(
      roles.map(r => registry.userRepository.findMany({ role: r, status: UserStatus.ACTIVE, limit: 100 }))
    );

    const staff = results
      .flatMap(r => r.items)
      .filter(u => u.id !== userId) // exclude self
      .map(u => ({
        id:        u.id,
        firstName: u.firstName,
        lastName:  u.lastName,
        role:      u.role,
      }));

    return ok(staff);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
