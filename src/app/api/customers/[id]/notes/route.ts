export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';
import { z } from 'zod';
import { randomUUID } from 'crypto';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const CreateNoteSchema = z.object({
  noteType: z.enum(['consultation', 'procedure', 'followup', 'general', 'complaint']),
  content: z.string().min(1).max(4000),
  privacy: z.enum(['PRIVATE', 'SHARED', 'ADMIN_ONLY', 'CLIENT_VISIBLE']).default('PRIVATE'),
  appointmentId: z.string().uuid().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const { id: profileId } = await context.params;
    const registry = DIRegistry.instance;

    const notes = await registry.specialistNoteRepository.findByProfile(profileId);
    return ok(notes);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const { id: profileId } = await context.params;
    const body: unknown = await req.json();
    const parsed = CreateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400);
    }

    const registry = DIRegistry.instance;

    // Resolve specialistId from userId — find specialist whose userId matches
    const specialist = await registry.specialistRepository.findByUserId(userId).catch(() => null);
    if (!specialist) {
      return apiError('FORBIDDEN', 'Only specialists can create notes', 403);
    }

    const note = await registry.specialistNoteRepository.create({
      id: randomUUID(),
      specialistId: specialist.id,
      profileId,
      appointmentId: parsed.data.appointmentId ?? null,
      noteType: parsed.data.noteType,
      content: parsed.data.content,
      privacy: parsed.data.privacy,
    });

    return ok(note, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
