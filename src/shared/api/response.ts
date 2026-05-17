import { NextResponse } from 'next/server';
import type { ApiSuccessResponse, ApiErrorResponse } from '@shared/types/api.types';

type PaginationMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

export function success<T>(data: T, status = 200, meta?: PaginationMeta): NextResponse {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta !== undefined ? { meta } : {}),
  };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T): NextResponse {
  return success(data, 201);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function error(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return error('UNAUTHORIZED', message, 401);
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return error('FORBIDDEN', message, 403);
}

export function notFound(message = 'Not found'): NextResponse {
  return error('NOT_FOUND', message, 404);
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return error('BAD_REQUEST', message, 400, details);
}

export function conflict(message: string): NextResponse {
  return error('CONFLICT', message, 409);
}

export function tooManyRequests(message = 'Too many requests'): NextResponse {
  return error('RATE_LIMIT', message, 429);
}

export function internalError(message = 'Internal server error'): NextResponse {
  return error('INTERNAL_ERROR', message, 500);
}
