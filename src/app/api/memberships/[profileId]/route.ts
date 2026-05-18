export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { DomainError } from '@/domain/errors';

function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { profileId: string } },
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const registry = DIRegistry.instance;
    const memberships = await registry.clientMembershipRepository.findByProfileId(params.profileId);

    // Enrich with plan details
    const enriched = await Promise.all(
      memberships.map(async (m) => {
        const plan = await registry.membershipPlanRepository.findById(m.planId);
        return {
          id: m.id,
          profileId: m.profileId,
          planId: m.planId,
          planName: plan?.name ?? null,
          billingPeriod: plan?.billingPeriod ?? null,
          discountPercent: plan?.discountPercent ?? 0,
          status: m.status,
          startedAt: m.startedAt,
          renewsAt: m.renewsAt,
          cancelledAt: m.cancelledAt,
          sessionsUsed: m.sessionsUsed,
          includedSessions: plan?.includedSessions ?? null,
          autoRenew: m.autoRenew,
        };
      }),
    );

    return ok({ memberships: enriched });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
