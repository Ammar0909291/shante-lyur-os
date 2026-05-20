import { toast } from '@/hooks/use-toast';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ApiOptions {
  silent?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  opts: ApiOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    const e = new ApiError('Сетевая ошибка', 'NETWORK_ERROR', 0);
    if (!opts.silent) toast.error(e.message);
    throw e;
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const errBody = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
    const code = errBody?.error?.code ?? 'HTTP_ERROR';
    const message = errBody?.error?.message ?? `HTTP ${res.status}`;
    const err = new ApiError(message, code, res.status, errBody?.error?.details);
    if (!opts.silent && res.status !== 401) toast.error(message);
    throw err;
  }

  // Unwrap { success: true, data } envelope when present.
  if (payload && typeof payload === 'object' && 'success' in (payload as Record<string, unknown>)) {
    const env = payload as ApiResponse<T>;
    if (env.success) return env.data;
    const err = new ApiError(env.error.message, env.error.code, res.status, env.error.details);
    if (!opts.silent) toast.error(env.error.message);
    throw err;
  }

  return payload as T;
}

export const apiGet = <T>(path: string, opts?: ApiOptions) => request<T>('GET', path, undefined, opts);
export const apiPost = <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('POST', path, body, opts);
export const apiPatch = <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('PATCH', path, body, opts);
export const apiPut = <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('PUT', path, body, opts);
export const apiDelete = <T>(path: string, opts?: ApiOptions) => request<T>('DELETE', path, undefined, opts);
