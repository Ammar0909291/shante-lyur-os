export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ListAppointmentsUseCase, CreateAppointmentUseCase } from '@/application/use-cases/booking';
import { ListAppointmentsSchema, CreateAppointmentSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import { ADMIN_ROLES } from '@/lib/admin-roles';
import { noopEventBus } from '@/lib/noop-event-bus';
import { serializeAppointments } from '@/lib/appointment-serializer';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((value, key) => { raw[key] = value; });

    const parsed = ListAppointmentsSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;

    // Specialists may only see their own appointments — resolve userId → specialistId
    let dto = parsed.data;
    if (role === UserRole.SPECIALIST) {
      const specialist = await registry.specialistRepository.findByUserId(userId);
      if (!specialist) return apiError('NOT_FOUND', 'Specialist profile not found', 404);
      dto = { ...parsed.data, specialistId: specialist.id };
    }

    const useCase = new ListAppointmentsUseCase(registry.appointmentRepository);
    const result = await useCase.execute(dto, userId, role);

    const serialized = await serializeAppointments(result.items);
    return ok({ items: serialized, total: result.total });
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
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body: unknown = await req.json();
    const parsed = CreateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const effectiveClientId =
      ADMIN_ROLES.includes(role) && parsed.data.clientId
        ? parsed.data.clientId
        : userId;

    const registry = DIRegistry.instance;
    const useCase = new CreateAppointmentUseCase(
      registry.appointmentRepository,
      registry.userRepository,
      registry.specialistRepository,
      registry.serviceRepository,
      registry.locationRepository,
      registry.workingScheduleRepository,
      registry.blockedTimeRepository,
      registry.vacationRepository,
      registry.customerProfileRepository,
      registry.promoCodeRepository,
      noopEventBus,
      registry.notificationRepository,
    );

    const { appointment } = await useCase.execute(parsed.data, effectiveClientId, role);

    const [serialized] = await serializeAppointments([appointment]);
    return ok(serialized, 201);
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
