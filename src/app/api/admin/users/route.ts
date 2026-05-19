export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateUserSchema } from '@/application/dto';
import { User, AuditLog } from '@/domain/entities';
import { UserRole, UserStatus, AuditAction } from '@/domain/enums';
import { Email, PhoneNumber } from '@/domain/value-objects';
import { ConflictError, DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ADMIN_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? '';
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!ADMIN_ROLES.includes(role)) {
      return apiError('FORBIDDEN', 'Admin access required', 403);
    }

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20', 10)));
    const roleFilter = params.get('role') as UserRole | null;

    const registry = DIRegistry.instance;
    const users = await registry.userRepository.findMany({
      page,
      limit,
      role: roleFilter ?? undefined,
    });

    return ok(users);
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

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? '') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!ADMIN_ROLES.includes(role)) {
      return apiError('FORBIDDEN', 'Admin access required', 403);
    }

    const body: unknown = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;

    // CreateUserUseCase.execute calls actorRole.can() which is not implemented on the enum.
    // Implement inline using repositories directly.
    const email = Email.create(parsed.data.email);
    if (await registry.userRepository.exists(email.value)) {
      throw new ConflictError('User with this email already exists', 'email');
    }

    const passwordHash = await registry.passwordHasher.hash(parsed.data.password);
    const phone = parsed.data.phone ? PhoneNumber.create(parsed.data.phone) : undefined;

    const user = new User({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone,
      role: parsed.data.role as UserRole,
      status: parsed.data.status as UserStatus,
      emailVerified: true,
      phoneVerified: false,
      failedLogins: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await registry.userRepository.create(user);

    await registry.auditLogRepository.create(
      AuditLog.create({
        userId,
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: saved.id,
        newValues: { email: saved.email.value, role: saved.role },
      })
    );

    return ok({
      user: {
        id: saved.id,
        email: saved.email.value,
        firstName: saved.firstName,
        lastName: saved.lastName,
        role: saved.role,
        status: saved.status,
        emailVerified: saved.emailVerified,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
    }, 201);
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
