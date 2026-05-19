import { DIRegistry } from '@/infrastructure/config/di-registry';
import type { Appointment } from '@/domain/entities';

export interface SerializedAppointment {
  id: string;
  clientId: string;
  clientName: string;
  specialistId: string;
  specialistName: string;
  locationId: string;
  startAt: string;
  endAt: string;
  status: string;
  services: Array<{ serviceId: string; name: string; price: number; duration: number }>;
  serviceName: string;
  totalPrice: number;
  totalDuration: number;
  notes: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function serializeAppointments(items: Appointment[]): Promise<SerializedAppointment[]> {
  if (items.length === 0) return [];

  const registry = DIRegistry.instance;

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
