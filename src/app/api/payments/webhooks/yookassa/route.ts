export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ProcessWebhookUseCase } from '@/application/use-cases/payment';
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
      registry.auditLogRepository,
      registry.appointmentRepository,
      registry.customerProfileRepository,
      registry.specialistRepository,
      registry.revenueRecordRepository,
    );

    await useCase.execute({ provider: 'YOOKASSA', payload, signature });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    // Always return 200 for webhooks to prevent retries for non-retryable errors
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
