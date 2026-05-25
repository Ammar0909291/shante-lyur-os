export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ProcessRefundUseCase } from '@/application/use-cases/payment';
import { CreateRefundSchema } from '@/application/dto';
import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';
import { DomainError } from '@/domain/errors';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';

const noopEventBus: IEventBus = {
  async publish(_e: DomainEvent): Promise<void> {},
  subscribe(_t: string, _h: (e: DomainEvent) => Promise<void>): void {},
};

const REFUND_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!REFUND_ROLES.includes(role)) return R.forbidden('Refunds require Manager role or above');

  let body: unknown;
  try { body = await req.json(); } catch { return R.badRequest('Invalid JSON body'); }

  // paymentId comes from the URL param, not the body
  const parsed = CreateRefundSchema.safeParse({ ...body as object, paymentId: params.id });
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  try {
    const registry = DIRegistry.instance;
    const useCase  = new ProcessRefundUseCase(
      registry.paymentRepository,
      registry.refundRepository,
      registry.yooKassaGateway,
      registry.robokassaGateway,
      noopEventBus,
      registry.auditLogRepository,
    );

    const result = await useCase.execute(parsed.data, userId);

    void logAudit({
      userId, role,
      action:     'REFUND_ISSUED',
      entityType: 'Payment',
      entityId:   params.id,
      metadata:   { amount: parsed.data.amount, reason: parsed.data.reason },
      ...getRequestMeta(req),
    });

    return R.success({
      refundId: result.refund.id,
      status:   result.refund.status,
      amount:   parsed.data.amount,
    }, 201);
  } catch (err) {
    if (err instanceof DomainError) return R.error(err.code, err.message, err.statusCode);
    if (err instanceof Error)       return R.error('REFUND_ERROR', err.message, 500);
    return R.internalError();
  }
}
