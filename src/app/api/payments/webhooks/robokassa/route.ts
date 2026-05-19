export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { ProcessWebhookUseCase } from '@/application/use-cases/payment';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-signature') ??
      req.headers.get('x-robokassa-signature') ??
      '';

    let payload: Record<string, unknown>;

    // Robokassa may send URL-encoded form data
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = new URLSearchParams(rawBody);
      payload = Object.fromEntries(formData.entries());
    } else {
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ success: true }, { status: 200 });
      }
    }

    const registry = DIRegistry.instance;
    const useCase = new ProcessWebhookUseCase(
      registry.paymentRepository,
      registry.refundRepository,
      registry.yooKassaGateway,
      registry.robokassaGateway,
      registry.eventBus,
      registry.auditLogRepository,
      registry.appointmentRepository,
      registry.customerProfileRepository,
      registry.specialistRepository,
      registry.revenueRecordRepository,
    );

    await useCase.execute({ provider: 'ROBOKASSA', payload, signature });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    // Always return 200 for webhooks to prevent retries
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
