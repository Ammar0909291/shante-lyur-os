export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ProcessWebhookUseCase } from '@/application/use-cases/payment';
import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';

const noopEventBus: IEventBus = {
  async publish(_event: DomainEvent): Promise<void> {},
  subscribe(_eventType: string, _handler: (event: DomainEvent) => Promise<void>): void {},
};

export async function POST(req: NextRequest) {
  // Always return 200 to prevent YooKassa from retrying on application errors.
  // Signature verification failures still return 200 to avoid information leakage.
  try {
    const rawBody = await req.text();

    // YooKassa sends X-Idempotence-Key as the notification's unique ID
    const idempotenceKey = req.headers.get('x-idempotence-key') ?? '';

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      // Malformed JSON is silently acknowledged — do not reveal parsing details
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const registry = DIRegistry.instance;
    const useCase = new ProcessWebhookUseCase(
      registry.paymentRepository,
      registry.refundRepository,
      registry.yooKassaGateway,
      registry.robokassaGateway,
      noopEventBus,
      registry.auditLogRepository,
      registry.appointmentRepository,
      registry.customerProfileRepository,
      registry.specialistRepository,
      registry.revenueRecordRepository,
    );

    // Pass the idempotence key as the signature — YooKassa verifies via re-fetch,
    // so the gateway implementation ignores this field; it is kept for logging/tracing.
    await useCase.execute({ provider: 'YOOKASSA', payload, signature: idempotenceKey });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
