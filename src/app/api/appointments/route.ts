export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ListAppointmentsUseCase, CreateAppointmentUseCase } from '@/application/use-cases/booking';
import { ListAppointmentsSchema, CreateAppointmentSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';

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

    return ok(result);
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

    const result = await useCase.execute(parsed.data, userId, role);

    // Fire-and-forget appointment confirmation notification
    const user = await registry.userRepository.findById(userId);
    if (user) {
      const appt = result.appointment;
      const serviceName = appt.services.map((s: { name: string }) => s.name).join(', ') || 'Услуга';
      const specialist = await registry.specialistRepository.findById(appt.specialistId);
      const specialistUser = specialist ? await registry.userRepository.findById(specialist.userId) : null;
      registry.notificationService.sendBookingConfirmation(user, {
        serviceName,
        specialistName: specialistUser ? `${specialistUser.firstName} ${specialistUser.lastName}` : '',
        date: appt.startAt.toLocaleDateString('ru-RU'),
        time: appt.startAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      }).catch(() => {});
    }

    return ok(result, 201);
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
