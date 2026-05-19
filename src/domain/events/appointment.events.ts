import { BaseDomainEvent } from './domain-event';

export class AppointmentBookedEvent extends BaseDomainEvent {
  constructor(
    appointmentId: string,
    payload: {
      clientId: string;
      specialistId: string;
      locationId: string;
      startAt: string;
      endAt: string;
      services: Array<{ serviceId: string; name: string; price: number }>;
      totalPrice: number;
    }
  ) {
    super('APPOINTMENT_BOOKED', appointmentId, 'Appointment', payload);
  }
}

export class AppointmentConfirmedEvent extends BaseDomainEvent {
  constructor(
    appointmentId: string,
    payload: { confirmedBy: string; confirmedAt: string }
  ) {
    super('APPOINTMENT_CONFIRMED', appointmentId, 'Appointment', payload);
  }
}

export class AppointmentCancelledEvent extends BaseDomainEvent {
  constructor(
    appointmentId: string,
    payload: {
      cancelledBy: string;
      reason: string;
      refundAmount?: number;
    }
  ) {
    super('APPOINTMENT_CANCELLED', appointmentId, 'Appointment', payload);
  }
}

export class AppointmentRescheduledEvent extends BaseDomainEvent {
  constructor(
    appointmentId: string,
    payload: {
      oldStartAt: string;
      oldEndAt: string;
      newStartAt: string;
      newEndAt: string;
      rescheduledBy: string;
    }
  ) {
    super('APPOINTMENT_RESCHEDULED', appointmentId, 'Appointment', payload);
  }
}

export class AppointmentCompletedEvent extends BaseDomainEvent {
  constructor(
    appointmentId: string,
    payload: {
      completedAt: string;
      services: Array<{ serviceId: string; name: string }>;
      totalPrice: number;
    }
  ) {
    super('APPOINTMENT_COMPLETED', appointmentId, 'Appointment', payload);
  }
}

export class AppointmentNoShowEvent extends BaseDomainEvent {
  constructor(
    appointmentId: string,
    payload: { noShowAt: string; clientId: string }
  ) {
    super('APPOINTMENT_NO_SHOW', appointmentId, 'Appointment', payload);
  }
}
