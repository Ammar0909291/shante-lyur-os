export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ListAppointmentsUseCase, CreateAppointmentUseCase } from '@/application/use-cases/booking';
import { ListAppointmentsSchema, CreateAppointmentSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';
import { ok, apiError, validationError, unauthorized, internalError } from '@/lib/api-response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';

const noopEventBus: IEventBus = {
  async publish(_event: DomainEvent): Promise<void> {},
  subscribe(_eventType: string, _handler: (event: DomainEvent) => Promise<void>): void {},
};

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return unauthorized();

    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((value, key) => { raw[key] = value; });

    const parsed = ListAppointmentsSchema.safeParse(raw);
    if (!parsed.success) {
      return validationError('Invalid query parameters', { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;
    const useCase = new ListAppointmentsUseCase(
      registry.appointmentRepository,
      registry.specialistRepository,
    );
    const result = await useCase.execute(parsed.data, userId, role);
    return ok(result);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return internalError(error instanceof Error ? error.message : undefined);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) return unauthorized();

    const body: unknown = await req.json();
    const parsed = CreateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError('Invalid request body', { issues: parsed.error.issues });
    }

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

    // Admin/super-admin can book on behalf of a client via body.clientId.
    const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
    const effectiveClientId =
      ADMIN_ROLES.includes(role) && parsed.data.clientId
        ? parsed.data.clientId
        : userId;

    // If the provided locationId doesn't resolve, fall back to the first active location.
    let resolvedLocationId = parsed.data.locationId;
    const loc = await registry.locationRepository.findById(resolvedLocationId).catch(() => null);
    if (!loc || !loc.isActive) {
      const { items } = await registry.locationRepository.findMany({ isActive: true, limit: 1 }).catch(() => ({ items: [] }));
      if (items[0]) resolvedLocationId = items[0].id;
    }

    const result = await useCase.execute(
      { ...parsed.data, locationId: resolvedLocationId },
      effectiveClientId,
      role,
    );

    // Audit: appointment created
    const { ipAddress, userAgent } = getRequestMeta(req);
    void logAudit({
      userId,
      role,
      action: 'CREATE',
      entityType: 'appointment',
      entityId: result.appointment.id,
      appointmentId: result.appointment.id,
      newValues: {
        specialistId: result.appointment.specialistId,
        startAt: result.appointment.startAt,
        endAt: result.appointment.endAt,
        status: result.appointment.status,
        totalPrice: result.appointment.totalPrice.amount,
      },
      ipAddress,
      userAgent,
    });

    return ok(result, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return internalError(error instanceof Error ? error.message : undefined);
  }
}
