import { prisma } from '@/infrastructure/config/prisma-client';
import type { BookingTriggerParams } from './booking-triggers';

const YEKATERINBURG = 'Asia/Yekaterinburg';

/**
 * Builds a complete BookingTriggerParams by doing a fresh DB query.
 * Guarantees real service names regardless of in-memory entity state.
 */
export async function buildBookingNotificationPayload(
  appointmentId: string,
): Promise<BookingTriggerParams | null> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      startAt: true,
      clientId: true,
      client: { select: { id: true, firstName: true, lastName: true } },
      specialist: {
        select: {
          department: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      room: { select: { name: true } },
      services: {
        select: { sortOrder: true, service: { select: { name: true } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!apt || !apt.clientId) return null;

  const clientName = apt.client
    ? `${apt.client.firstName} ${apt.client.lastName}`.trim()
    : 'Клиент';

  const specialistName = apt.specialist?.user
    ? `${apt.specialist.user.firstName} ${apt.specialist.user.lastName}`.trim()
    : 'Специалист';

  const serviceName =
    (apt.services ?? [])
      .map((s) => s.service.name)
      .filter(Boolean)
      .join(', ') || 'Услуга';

  const startAt = apt.startAt ?? new Date();
  const date = startAt.toLocaleDateString('ru-RU', {
    timeZone: YEKATERINBURG,
    day: 'numeric',
    month: 'long',
  });
  const time = startAt.toLocaleTimeString('ru-RU', {
    timeZone: YEKATERINBURG,
    hour: '2-digit',
    minute: '2-digit',
  });

  console.info('[payload-builder]', {
    appointmentId,
    clientName,
    specialistName,
    serviceName,
    serviceCount: (apt.services ?? []).length,
    date,
    time,
  });

  return {
    appointmentId: apt.id,
    clientUserId: apt.clientId,
    specialistUserId: apt.specialist?.user?.id,
    clientName,
    specialistName,
    serviceName,
    department: apt.specialist?.department ?? undefined,
    date,
    time,
    room: apt.room?.name ?? undefined,
  };
}
