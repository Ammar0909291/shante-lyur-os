export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateSpecialistSchema } from '@/application/dto';
import { Specialist } from '@/domain/entities';
import { AuditLog } from '@/domain/entities';
import { UserRole, SpecialistStatus, AuditAction } from '@/domain/enums';
import { Color } from '@/domain/value-objects/color.vo';
import { ConflictError, NotFoundError, ValidationError, DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ADMIN_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export async function GET(req: NextRequest) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const params = req.nextUrl.searchParams;
    const page  = Math.max(1, parseInt(params.get('page')  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
    const status = params.get('status') as SpecialistStatus | null;

    const registry = DIRegistry.instance;
    const result = await registry.specialistRepository.findMany({
      status: status ?? undefined,
      page,
      limit,
    });

    // Enrich with user data
    const enriched = await Promise.all(
      result.items.map(async (s) => {
        const user = await registry.userRepository.findById(s.userId);
        return {
          id: s.id,
          userId: s.userId,
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          email: user?.email?.value ?? '',
          phone: user?.phone?.value ?? null,
          bio: s.bio ?? null,
          specialization: s.specialization ?? null,
          experienceYears: s.experienceYears ?? null,
          rating: s.rating ?? null,
          reviewCount: s.reviewCount,
          commissionRate: s.commissionRate,
          status: s.status,
          color: s.color?.value ?? null,
          sortOrder: s.sortOrder,
          isActive: s.isActive,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      })
    );

    return ok({ items: enriched, total: result.total, page, limit });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const body: unknown = await req.json();
    const parsed = CreateSpecialistSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const dto = parsed.data;
    const registry = DIRegistry.instance;

    // Verify referenced user exists and has the SPECIALIST role
    const user = await registry.userRepository.findById(dto.userId);
    if (!user) throw new NotFoundError('User', dto.userId);
    if (user.role !== UserRole.SPECIALIST) {
      throw new ValidationError('User must have the SPECIALIST role to receive a specialist profile', {
        userId: ['User does not have the SPECIALIST role'],
      });
    }

    // Prevent duplicate specialist profiles
    const existing = await registry.specialistRepository.findByUserId(dto.userId);
    if (existing) {
      throw new ConflictError('This user already has a specialist profile', 'userId');
    }

    const specialist = new Specialist({
      id: crypto.randomUUID(),
      userId: dto.userId,
      bio: dto.bio,
      specialization: dto.specialization,
      experienceYears: dto.experienceYears,
      commissionRate: dto.commissionRate,
      color: dto.color ? Color.create(dto.color) : undefined,
      rating: undefined,
      reviewCount: 0,
      status: SpecialistStatus.ACTIVE,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await registry.specialistRepository.create(specialist);

    await registry.auditLogRepository.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.CREATE,
        entityType: 'Specialist',
        entityId: saved.id,
        newValues: {
          userId: saved.userId,
          specialization: saved.specialization ?? null,
          commissionRate: saved.commissionRate,
          status: saved.status,
        },
      })
    );

    return ok({
      id: saved.id,
      userId: saved.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email.value,
      bio: saved.bio ?? null,
      specialization: saved.specialization ?? null,
      experienceYears: saved.experienceYears ?? null,
      commissionRate: saved.commissionRate,
      status: saved.status,
      color: saved.color?.value ?? null,
      sortOrder: saved.sortOrder,
      createdAt: saved.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
