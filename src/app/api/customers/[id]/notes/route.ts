export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateSpecialistNoteSchema } from '@/application/dto';
import { DomainError } from '@/domain/errors';
import { UserRole } from '@/domain/enums';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const registry = DIRegistry.instance;
    const notes = await registry.specialistNoteRepository.findByProfile(id, 30);
    return ok(notes);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    // Clients cannot write notes; specialists and staff can
    if (role === UserRole.CLIENT) return apiError('FORBIDDEN', 'Insufficient permissions', 403);

    const { id: profileId } = await context.params;
    const body: unknown = await req.json();
    const parsed = CreateSpecialistNoteSchema.safeParse({ ...(body as object), profileId });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: { issues: parsed.error.issues } } },
        { status: 400 }
      );
    }

    const registry = DIRegistry.instance;
    const note = await registry.specialistNoteRepository.create({
      specialistId: parsed.data.specialistId,
      profileId,
      appointmentId: parsed.data.appointmentId,
      noteType: parsed.data.noteType,
      content: parsed.data.content,
      privacy: parsed.data.privacy,
    });

    return ok(note, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
