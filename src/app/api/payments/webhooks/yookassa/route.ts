export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ProcessWebhookUseCase } from '@/application/use-cases/payment';
import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';
import { completeSaleByProviderPaymentId } from '@/modules/sales/application/sales.service';
import { enqueueSaleNotification } from '@/shared/queue/enqueue';

const noopEventBus: IEventBus = {
  async publish(_event: DomainEvent): Promise<void> {},
  subscribe(_eventType: string, _handler: (event: DomainEvent) => Promise<void>): void {},
};

export async function POST(req: NextRequest) {
  // Return 200 immediately to prevent webhook timeout; process async
  // In practice we process synchronously here and rely on the fast path
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-idempotence-key') ??
      req.headers.get('x-signature') ??
      '';

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      // Return 200 to acknowledge receipt even for malformed payloads
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

    await useCase.execute({ provider: 'YOOKASSA', payload, signature });

    // Dispatch sale notification if this was a captured payment
    const body = payload as { object?: { id?: string; status?: string; paid?: boolean } };
    const obj  = body?.object ?? {};
    const wasCaptured = obj.paid === true || obj.status === 'succeeded';
    const providerPaymentId = obj.id;

    if (wasCaptured && providerPaymentId) {
      try {
        const event = await completeSaleByProviderPaymentId(providerPaymentId, 'YOOKASSA');
        if (event) {
          await enqueueSaleNotification({
            bookingId:      event.bookingId,
            transactionId:  event.transactionId,
            clientName:     event.clientName,
            specialistName: event.specialistName,
            serviceNames:   event.serviceNames,
            amount:         event.amount,
            currency:       event.currency,
            paidAt:         event.paidAt,
            triggeredAt:    new Date().toISOString(),
          });
        }
      } catch {
        // Non-fatal — notification failure must not fail the webhook
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    // Always return 200 for webhooks to prevent retries for non-retryable errors
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
