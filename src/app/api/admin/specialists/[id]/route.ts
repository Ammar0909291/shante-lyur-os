export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { UpdateSpecialistSchema } from '@/application/dto';
import { Specialist, AuditLog } from '@/domain/entities';
import { SpecialistStatus, AuditAction, AppointmentStatus } from '@/domain/enums';
import { Color } from '@/domain/value-objects/color.vo';
import { NotFoundError, DomainError, ConflictError } from '@/domain/errors';
import { ADMIN_ROLES } from '@/lib/admin-roles';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type RouteContext = { params: { id: string } };

function serializeSpecialist(
  s: Specialist,
  user: { firstName: string; lastName: string; email: { value: string }; phone?: { value: string } | null } | null,
) {
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
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = _req.headers.get('x-user-id');
    const role    = _req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const registry = DIRegistry.instance;
    const specialist = await registry.specialistRepository.findById(params.id);
    if (!specialist) throw new NotFoundError('Specialist', params.id);

    const user = await registry.userRepository.findById(specialist.userId);
    return ok(serializeSpecialist(specialist, user));
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const body: unknown = await req.json();
    const parsed = UpdateSpecialistSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const dto = parsed.data;
    const registry = DIRegistry.instance;

    const current = await registry.specialistRepository.findById(params.id);
    if (!current) throw new NotFoundError('Specialist', params.id);

    // Merge fields — undefined means "keep current value", empty string means "clear"
    const newBio = dto.bio !== undefined
      ? (dto.bio === '' ? undefined : dto.bio)
      : current.bio;
    const newSpecialization = dto.specialization !== undefined
      ? (dto.specialization === '' ? undefined : dto.specialization)
      : current.specialization;
    const newColor = dto.color !== undefined
      ? (dto.color === '' ? undefined : Color.create(dto.color))
      : current.color;

    const updated = new Specialist({
      id: current.id,
      userId: current.userId,
      bio: newBio,
      specialization: newSpecialization,
      experienceYears: dto.experienceYears !== undefined ? dto.experienceYears : current.experienceYears,
      commissionRate: dto.commissionRate !== undefined ? dto.commissionRate : current.commissionRate,
      color: newColor,
      rating: current.rating,
      reviewCount: current.reviewCount,
      status: (dto.status as SpecialistStatus) ?? current.status,
      sortOrder: current.sortOrder,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    });

    const saved = await registry.specialistRepository.update(updated);

    await registry.auditLogRepository.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.UPDATE,
        entityType: 'Specialist',
        entityId: saved.id,
        newValues: {
          status: saved.status,
          specialization: saved.specialization ?? null,
          bio: saved.bio ?? null,
          experienceYears: saved.experienceYears ?? null,
          commissionRate: saved.commissionRate,
          color: saved.color?.value ?? null,
        },
      })
    );

    const user = await registry.userRepository.findById(saved.userId);
    return ok(serializeSpecialist(saved, user));
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const registry = DIRegistry.instance;
    const current = await registry.specialistRepository.findById(params.id);
    if (!current) throw new NotFoundError('Specialist', params.id);

    // Guard: block termination if specialist has pending or confirmed upcoming appointments
    const activeAppointments = await registry.appointmentRepository.findMany({
      specialistId: params.id,
      status: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      from: new Date(),
      limit: 1,
    });
    if (activeAppointments.total > 0) {
      throw new ConflictError(
        'Cannot terminate specialist with active upcoming appointments. Reassign or cancel them first.',
        'specialistId',
      );
    }

    // Soft-delete: terminate preserves all historical data (appointments, revenue)
    const terminated = new Specialist({
      id: current.id,
      userId: current.userId,
      bio: current.bio,
      specialization: current.specialization,
      experienceYears: current.experienceYears,
      commissionRate: current.commissionRate,
      color: current.color,
      rating: current.rating,
      reviewCount: current.reviewCount,
      status: SpecialistStatus.TERMINATED,
      sortOrder: current.sortOrder,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    });

    const saved = await registry.specialistRepository.update(terminated);

    await registry.auditLogRepository.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.DELETE,
        entityType: 'Specialist',
        entityId: saved.id,
        newValues: { status: SpecialistStatus.TERMINATED },
      })
    );

    return ok({ id: saved.id, status: saved.status });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
