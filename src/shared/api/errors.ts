import { NextResponse } from 'next/server';
import { ValidationError } from '@domain/errors/validation-error';
import { NotFoundError } from '@domain/errors/not-found-error';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';
import { ForbiddenError } from '@domain/errors/forbidden-error';
import { ConflictError } from '@domain/errors/conflict-error';
import { RateLimitError } from '@domain/errors/rate-limit-error';
import { DomainError } from '@domain/errors/domain-error';
import {
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  conflict,
  tooManyRequests,
  internalError,
  error,
} from './response';

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ValidationError) {
    return badRequest(err.message, err.fieldErrors);
  }

  if (err instanceof NotFoundError) {
    return notFound(err.message);
  }

  if (err instanceof UnauthorizedError) {
    return unauthorized(err.message);
  }

  if (err instanceof ForbiddenError) {
    return forbidden(err.message);
  }

  if (err instanceof ConflictError) {
    return conflict(err.message);
  }

  if (err instanceof RateLimitError) {
    return tooManyRequests(err.message);
  }

  if (err instanceof DomainError) {
    return error(err.code, err.message, 400, err.details);
  }

  // Unknown errors — do not leak internals
  return internalError();
}
