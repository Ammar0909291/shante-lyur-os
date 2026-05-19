export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateWorkingScheduleSchema } from '@/application/dto';
import { WorkingSchedule } from '@/domain/entities/working-schedule.entity';
import { DayOfWeek } from '@/domain/enums';
import { ADMIN_ROLES } from '@/lib/admin-roles';
import { NotFoundError, DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type RouteContext = { params: { id: string } };

function serializeSchedule(ws: WorkingSchedule) {
  return {
    id: ws.id,
    specialistId: ws.specialistId,
    locationId: ws.locationId,
    dayOfWeek: ws.dayOfWeek,
    startTime: ws.startTime,
    endTime: ws.endTime,
    breakStart: ws.breakStart ?? null,
    breakEnd: ws.breakEnd ?? null,
    isActive: ws.isActive,
    validFrom: ws.validFrom,
    validUntil: ws.validUntil ?? null,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
  };
}

// GET /api/admin/specialists/[id]/schedules
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const registry = DIRegistry.instance;
    const specialist = await registry.specialistRepository.findById(params.id);
    if (!specialist) throw new NotFoundError('Specialist', params.id);

    const schedules = await registry.workingScheduleRepository.findBySpecialistId(params.id);
    return ok({ items: schedules.map(serializeSchedule) });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

// POST /api/admin/specialists/[id]/schedules
// Replace-all strategy: deletes existing active schedules and creates new ones.
// Body must satisfy CreateWorkingScheduleSchema (specialistId, locationId, schedules[], validFrom, validUntil?).
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const body: unknown = await req.json();
    const parsed = CreateWorkingScheduleSchema.safeParse({
      ...( typeof body === 'object' && body !== null ? body : {}),
      specialistId: params.id,
    });
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues });
    }

    const dto = parsed.data;
    const registry = DIRegistry.instance;

    const specialist = await registry.specialistRepository.findById(params.id);
    if (!specialist) throw new NotFoundError('Specialist', params.id);

    const location = await registry.locationRepository.findById(dto.locationId);
    if (!location) throw new NotFoundError('Location', dto.locationId);

    // Replace: soft-delete then recreate (delete all existing for this specialist)
    await registry.workingScheduleRepository.deleteBySpecialist(params.id);

    const created = await Promise.all(
      dto.schedules.map(entry =>
        registry.workingScheduleRepository.create(
          new WorkingSchedule({
            id: crypto.randomUUID(),
            specialistId: params.id,
            locationId: dto.locationId,
            dayOfWeek: entry.dayOfWeek as DayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            breakStart: entry.breakStart || undefined,
            breakEnd: entry.breakEnd || undefined,
            isActive: true,
            validFrom: dto.validFrom,
            validUntil: dto.validUntil,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        )
      )
    );

    return ok({ items: created.map(serializeSchedule) }, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

// DELETE /api/admin/specialists/[id]/schedules
// Clears all schedules for this specialist.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const registry = DIRegistry.instance;
    const specialist = await registry.specialistRepository.findById(params.id);
    if (!specialist) throw new NotFoundError('Specialist', params.id);

    await registry.workingScheduleRepository.deleteBySpecialist(params.id);
    return ok({ specialistId: params.id });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
