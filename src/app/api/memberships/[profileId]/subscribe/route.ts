export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { PurchaseMembershipUseCase, CancelMembershipUseCase } from '@/application/use-cases/membership';
import { PurchaseMembershipSchema, CancelMembershipSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { profileId: string } },
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body: unknown = await req.json();
    const parsed = PurchaseMembershipSchema.safeParse({ ...body as object, profileId: params.profileId });
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;
    const useCase = new PurchaseMembershipUseCase(
      registry.membershipPlanRepository,
      registry.clientMembershipRepository,
      registry.customerProfileRepository,
      registry.loyaltyRepository,
    );

    const membership = await useCase.execute(parsed.data);
    return ok({ membership }, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { profileId: string } },
) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const membershipId = req.nextUrl.searchParams.get('membershipId');
    if (!membershipId) return apiError('VALIDATION_ERROR', 'membershipId required', 400);

    const body: unknown = await req.json().catch(() => ({}));
    const parsed = CancelMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });
    }

    const registry = DIRegistry.instance;
    const useCase = new CancelMembershipUseCase(
      registry.clientMembershipRepository,
      registry.customerProfileRepository,
    );

    const membership = await useCase.execute(membershipId, parsed.data, userId, role);
    return ok({ membership });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
