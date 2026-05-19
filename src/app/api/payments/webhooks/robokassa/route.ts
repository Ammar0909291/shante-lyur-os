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
  try {
    const rawBody = await req.text();
    const contentType = req.headers.get('content-type') ?? '';

    // Robokassa sends form-encoded data to the Result URL
    let payload: Record<string, string>;
    if (contentType.includes('application/x-www-form-urlencoded')) {
      payload = Object.fromEntries(new URLSearchParams(rawBody).entries());
    } else {
      try {
        payload = JSON.parse(rawBody) as Record<string, string>;
      } catch {
        return NextResponse.json({ success: true }, { status: 200 });
      }
    }

    // SignatureValue is part of the payload; signature verification happens inside the gateway
    const signature = payload['SignatureValue'] ?? payload['signatureValue'] ?? '';

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

    await useCase.execute({ provider: 'ROBOKASSA', payload, signature });

    // Robokassa expects the literal string "OK${InvId}" on success
    const invId = payload['InvId'] ?? '';
    return new Response(`OK${invId}`, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch {
    // Return success to suppress Robokassa retries for non-retryable application errors
    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}
