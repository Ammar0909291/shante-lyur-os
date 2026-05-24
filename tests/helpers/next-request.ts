/**
 * Lightweight helpers for constructing NextRequest objects in tests.
 * Avoids the need for a running Next.js server in integration tests.
 */
import { NextRequest } from 'next/server';

const BASE = 'http://localhost:3000';

export function makeRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams } = options;

  const url = new URL(path, BASE);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }

  const init = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  } as ConstructorParameters<typeof NextRequest>[1];
  if (body !== undefined) (init as Record<string, unknown>).body = JSON.stringify(body);

  return new NextRequest(url.toString(), init);
}

export async function parseResponse<T = unknown>(
  res: Response,
): Promise<{ status: number; body: T }> {
  const body = (await res.json()) as T;
  return { status: res.status, body };
}
