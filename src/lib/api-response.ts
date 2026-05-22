import { NextResponse } from 'next/server';

// ─── Canonical response shape ─────────────────────────────────────────────────

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

// ─── Response helpers ─────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    } satisfies ApiError,
    { status },
  );
}

// ─── Convenience shortcuts ────────────────────────────────────────────────────

export const unauthorized = (msg = 'Authentication required') =>
  apiError('UNAUTHORIZED', msg, 401);

export const forbidden = (msg = 'Access denied') =>
  apiError('FORBIDDEN', msg, 403);

export const notFound = (entity = 'Resource') =>
  apiError('NOT_FOUND', `${entity} not found`, 404);

export const conflict = (msg: string, details?: unknown) =>
  apiError('CONFLICT', msg, 409, details);

export const validationError = (msg: string, details?: unknown) =>
  apiError('VALIDATION_ERROR', msg, 400, details);

export const invalidTransition = (from: string, action: string) =>
  apiError('INVALID_TRANSITION', `Cannot perform '${action}' from status '${from}'`, 422);

export const internalError = (msg = 'An unexpected error occurred') =>
  apiError('INTERNAL_ERROR', msg, 500);
