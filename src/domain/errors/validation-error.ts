import { DomainError } from './domain-error';

export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors });
  }

  static fromZod(errors: Array<{ path: (string | number)[]; message: string }>): ValidationError {
    const fieldErrors: Record<string, string[]> = {};
    for (const err of errors) {
      const path = err.path.join('.');
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(err.message);
    }
    return new ValidationError('Validation failed', fieldErrors);
  }
}
