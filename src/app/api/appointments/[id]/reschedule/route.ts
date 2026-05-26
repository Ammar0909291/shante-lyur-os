export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { RescheduleAppointmentUseCase } from '@/application/use-cases/booking';
import { RescheduleAppointmentSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';
import { prisma } from '@/infrastructure/config/prisma-client';
import { triggerBookingRescheduled } from '@/lib/communication/booking-triggers';
import { cancelReminders, scheduleReminders } from '@/lib/communication/reminder-scheduler';
import { pushOpsEventToUser } from '@/lib/ops-sse';

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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = RescheduleAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new RescheduleAppointmentUseCase(
      registry.appointmentRepository,
      registry.specialistRepository,
      registry.blockedTimeRepository,
      registry.vacationRepository,
      registry.workingScheduleRepository,
      registry.auditLogRepository,
      noopEventBus,
    );

    const result = await useCase.execute(id, parsed.data, userId, role);

    // Communication + reminder rescheduling (non-blocking)
    void (async () => {
      try {
        const apt = await prisma.appointment.findUnique({
          where: { id },
          include: {
            client: { select: { firstName: true, lastName: true } },
            specialist: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
            services: { include: { service: { select: { name: true } } }, take: 1, orderBy: { sortOrder: 'asc' } },
          },
        });
        if (!apt) return;

        const clientName = `${apt.client.firstName} ${apt.client.lastName}`;
        const specialistName = apt.specialist?.user
          ? `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}` : 'Специалист';
        const specialistUserId = apt.specialist?.user?.id;
        const serviceName = apt.services[0]?.service.name ?? 'Услуга';
        const dateStr = apt.startAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        const timeStr = apt.startAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        await triggerBookingRescheduled({
          appointmentId: id, clientUserId: apt.clientId, specialistUserId,
          clientName, specialistName, serviceName, date: dateStr, time: timeStr,
        });

        // Notify specialist of rescheduling via IN_APP bell
        if (specialistUserId) {
          try {
            const now = new Date();
            await prisma.notification.create({
              data: {
                userId: specialistUserId,
                type: 'APPOINTMENT_RESCHEDULED',
                channel: 'IN_APP',
                status: 'SENT',
                title: 'Запись перенесена',
                body: `${clientName} — ${serviceName} — ${dateStr} в ${timeStr}`,
                appointmentId: id,
                data: { clientName, serviceName, dateStr, timeStr },
                sentAt: now,
              },
            });
            pushOpsEventToUser(specialistUserId, { type: 'ops_refresh', ts: now.toISOString() });
          } catch (nErr) {
            console.warn('[Reschedule] Specialist notification error:', nErr instanceof Error ? nErr.message : nErr);
          }
        }

        // Cancel old reminders and schedule new ones for the updated time
        await cancelReminders(id);
        await scheduleReminders({
          appointmentId: id, clientUserId: apt.clientId,
          specialistUserId, startAt: apt.startAt,
        });
      } catch (err) {
        console.warn('[Reschedule] Communication trigger error:', err instanceof Error ? err.message : err);
      }
    })();

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
