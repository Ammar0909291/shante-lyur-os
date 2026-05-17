import { DomainError } from './domain-error';

export class RateLimitError extends DomainError {
  constructor(
    message: string = 'Too many requests',
    public readonly retryAfterSeconds: number = 60
  ) {
    super(message, 'RATE_LIMIT', 429, { retryAfterSeconds });
  }
}
