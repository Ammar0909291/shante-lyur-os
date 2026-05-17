import { DomainError } from './domain-error';

export class ConflictError extends DomainError {
  constructor(
    message: string,
    public readonly conflictField?: string
  ) {
    super(message, 'CONFLICT', 409, conflictField ? { conflictField } : undefined);
  }
}
