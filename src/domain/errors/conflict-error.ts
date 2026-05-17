import { DomainError } from './domain-error';

export class ConflictError extends DomainError {
  constructor(
    message: string,
    public readonly conflictField?: string
  ) {
    super(message, 'CONFLICT', 409, conflictField ? { conflictField } : undefined);
  }
}

export class SlotUnavailableError extends ConflictError {
  constructor() {
    super('Time slot is not available', 'startAt');
  }
}

export class AppointmentNotModifiableError extends ConflictError {
  constructor(status: string) {
    super(`Appointment cannot be modified in status: ${status}`, 'status');
  }
}
