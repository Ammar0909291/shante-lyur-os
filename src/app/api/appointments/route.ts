export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ListAppointmentsUseCase, CreateAppointmentUseCase } from '@/application/use-cases/booking';
import { ListAppointmentsSchema, CreateAppointmentSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import { ADMIN_ROLES } from '@/lib/admin-roles';
import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';
import type { Appointment } from '@/domain/entities';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const noopEventBus: IEventBus = {
  async publish(_event: DomainEvent): Promise<void> {},
  subscribe(_eventType: string, _handler: (event: DomainEvent) => Promise<void>): void {},
};

async function serializeAppointments(items: Appointment[]) {
  if (items.length === 0) return [];

  const registry = DIRegistry.instance;

  // Deduplicate IDs before fetching — avoids N+N queries for repeat specialists/clients
  const uniqueClientIds = [...new Set(items.map(a => a.clientId))];
  const uniqueSpecialistIds = [...new Set(items.map(a => a.specialistId))];

  const [clientUsers, specialists] = await Promise.all([
    Promise.all(uniqueClientIds.map(id => registry.userRepository.findById(id))),
    Promise.all(uniqueSpecialistIds.map(id => registry.specialistRepository.findById(id))),
  ]);

  const specialistUserIds = [...new Set(specialists.filter(Boolean).map(s => s!.userId))];
  const specialistUsers = await Promise.all(
    specialistUserIds.map(id => registry.userRepository.findById(id))
  );

  const clientMap = new Map(uniqueClientIds.map((id, i) => [id, clientUsers[i]]));
  const specialistMap = new Map(uniqueSpecialistIds.map((id, i) => [id, specialists[i]]));
  const specialistUserMap = new Map(specialistUserIds.map((id, i) => [id, specialistUsers[i]]));

  return items.map(a => {
    const client = clientMap.get(a.clientId);
    const specialist = specialistMap.get(a.specialistId);
    const specialistUser = specialist ? specialistUserMap.get(specialist.userId) : null;

    const clientName = client
      ? `${client.firstName} ${client.lastName}`.trim()
      : 'Клиент';
    const specialistName = specialistUser
      ? `${specialistUser.firstName} ${specialistUser.lastName}`.trim()
      : 'Специалист';

    const primaryService = a.services[0];

    return {
      id: a.id,
      clientId: a.clientId,
      clientName,
      specialistId: a.specialistId,
      specialistName,
      locationId: a.locationId,
      startAt: a.timeSlot.start.toISOString(),
      endAt: a.timeSlot.end.toISOString(),
      status: a.status,
      services: a.services.map(s => ({
        serviceId: s.serviceId,
        name: s.name,
        price: s.price.amount,
        duration: s.duration,
      })),
      serviceName: primaryService?.name ?? '—',
      totalPrice: a.totalPrice.amount,
      totalDuration: a.totalDuration,
      notes: a.notes ?? null,
      source: a.source ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  });
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
    const useCase = new ListAppointmentsUseCase(registry.appointmentRepository);
    const result = await useCase.execute(parsed.data, userId, role);

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

    // Admin/operator can book on behalf of a client by passing clientId in body
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

    // Serialize the created appointment
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
