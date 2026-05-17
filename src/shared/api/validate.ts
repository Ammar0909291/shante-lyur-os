import { z } from 'zod';
import { NextRequest } from 'next/server';
import { ValidationError } from '@domain/errors/validation-error';

export async function parseBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw ValidationError.fromZod(result.error.errors);
  }

  return result.data;
}

export function parseQuery<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): T {
  const params = req.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  params.forEach((value: string, key: string) => {
    raw[key] = value;
  });

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw ValidationError.fromZod(result.error.errors);
  }

  return result.data;
}
