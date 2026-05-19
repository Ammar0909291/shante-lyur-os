export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ADMIN_ROLES } from '@/lib/admin-roles';
import { NotFoundError, DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type RouteContext = { params: { id: string } };

const AssignServiceSchema = z.object({
  serviceId: z.string().uuid(),
  priceOverride: z.coerce.number().positive().optional(),
  durationOverride: z.coerce.number().int().positive().optional(),
});

const RemoveServiceSchema = z.object({
  serviceId: z.string().uuid(),
});

// GET /api/admin/specialists/[id]/services
// Returns all actively assigned services for this specialist, enriched with service details.
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const registry = DIRegistry.instance;

    const specialist = await registry.specialistRepository.findById(params.id);
    if (!specialist) throw new NotFoundError('Specialist', params.id);

    const items = await registry.specialistRepository.findAssignedServices(params.id);
    return ok({ items });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

// POST /api/admin/specialists/[id]/services
// Assign a service to the specialist (upsert — safe to call multiple times).
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const body: unknown = await req.json();
    const parsed = AssignServiceSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;

    const specialist = await registry.specialistRepository.findById(params.id);
    if (!specialist) throw new NotFoundError('Specialist', params.id);

    const service = await registry.serviceRepository.findById(parsed.data.serviceId);
    if (!service) throw new NotFoundError('Service', parsed.data.serviceId);

    await registry.specialistRepository.assignService(
      params.id,
      parsed.data.serviceId,
      parsed.data.priceOverride,
      parsed.data.durationOverride,
    );

    return ok({ specialistId: params.id, serviceId: parsed.data.serviceId }, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

// DELETE /api/admin/specialists/[id]/services
// Remove (soft-deactivate) a service assignment. Body: { serviceId }
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const actorId = req.headers.get('x-user-id');
    const role    = req.headers.get('x-user-role') ?? '';
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);
    if (!ADMIN_ROLES.includes(role)) return apiError('FORBIDDEN', 'Admin access required', 403);

    const body: unknown = await req.json();
    const parsed = RemoveServiceSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;

    const specialist = await registry.specialistRepository.findById(params.id);
    if (!specialist) throw new NotFoundError('Specialist', params.id);

    await registry.specialistRepository.removeService(params.id, parsed.data.serviceId);

    return ok({ specialistId: params.id, serviceId: parsed.data.serviceId });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
