export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import {
  UpdateAppointmentStatusUseCase,
  CancelAppointmentUseCase,
} from '@/application/use-cases/booking';
import { UpdateAppointmentSchema, CancelAppointmentSchema } from '@/application/dto';
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const registry = DIRegistry.instance;
    const appointment = await registry.appointmentRepository.findById(id);

    if (!appointment) {
      return apiError('NOT_FOUND', `Appointment ${id} not found`, 404);
    }

    return ok({ appointment });
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = UpdateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new UpdateAppointmentStatusUseCase(
      registry.appointmentRepository,
      registry.userRepository,
      registry.auditLogRepository,
      noopEventBus,
      registry.notificationRepository,
    );

    const result = await useCase.execute(id, parsed.data, userId, role);
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

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = CancelAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new CancelAppointmentUseCase(
      registry.appointmentRepository,
      registry.paymentRepository,
      registry.refundRepository,
      registry.promoCodeRepository,
      registry.auditLogRepository,
      noopEventBus,
      registry.yooKassaGateway,
      registry.robokassaGateway,
    );

    const result = await useCase.execute(id, parsed.data, userId, role);
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
