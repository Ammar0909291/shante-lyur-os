import { DomainError } from './domain-error';

export class NotFoundError extends DomainError {
  constructor(
    resource: string,
    identifier: string | Record<string, unknown>
  ) {
    super(
      `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource, identifier }
    );
  }
}
