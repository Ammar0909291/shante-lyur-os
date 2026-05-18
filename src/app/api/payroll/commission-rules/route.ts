export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateCommissionRuleSchema, UpdateCommissionRuleSchema } from '@/application/dto';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const specialistId = searchParams.get('specialistId');
    if (!specialistId) return apiError('VALIDATION_ERROR', 'specialistId is required', 400);

    const registry = DIRegistry.instance;
    const rules = await registry.payrollRepository.findCommissionRulesBySpecialist(specialistId);
    return ok(rules);
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body: unknown = await req.json();
    const parsed = CreateCommissionRuleSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });

    const registry = DIRegistry.instance;
    const rule = await registry.payrollRepository.createCommissionRule({
      ...parsed.data,
      isActive: true,
      createdBy: userId,
    });
    return ok(rule);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get('id');
    if (!ruleId) return apiError('VALIDATION_ERROR', 'id is required', 400);

    const body: unknown = await req.json();
    const parsed = UpdateCommissionRuleSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request', 400, { issues: parsed.error.issues });

    const registry = DIRegistry.instance;
    const rule = await registry.payrollRepository.updateCommissionRule(ruleId, parsed.data);
    return ok(rule);
  } catch (error) {
    if (error instanceof Error) return apiError('BAD_REQUEST', error.message, 400);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
