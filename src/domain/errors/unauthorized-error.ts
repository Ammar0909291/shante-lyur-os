import { DomainError } from './domain-error';

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}
