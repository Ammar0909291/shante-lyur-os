import { DomainError } from './domain-error';

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}
