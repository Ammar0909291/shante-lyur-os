import { IPaymentGateway, PaymentGatewayInitResult, PaymentGatewayVerifyResult } from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects/money.vo';

export class YooKassaGateway implements IPaymentGateway {
  name = 'yookassa';

  async createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    const shopId = process.env.YOOKASSA_SHOP_ID ?? '';
    const secretKey = process.env.YOOKASSA_SECRET_KEY ?? '';

    const idempotencyKey = (params.metadata?.['idempotencyKey'] as string | undefined) ?? crypto.randomUUID();

    const body = {
      amount: { value: params.amount.amount.toFixed(2), currency: params.amount.currency },
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      description: params.description,
      metadata: { orderId: params.orderId, ...params.metadata },
    };

    const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'Idempotence-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`YooKassa error: ${err}`);
    }

    const data = await response.json() as {
      id: string;
      confirmation?: { confirmation_url?: string };
    };

    return {
      paymentUrl: data.confirmation?.confirmation_url ?? '',
      providerPaymentId: data.id,
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<PaymentGatewayVerifyResult> {
    const event = payload as { object?: { id?: string; amount?: { value?: string }; paid?: boolean } };
    return {
      success: true,
      providerPaymentId: event.object?.id ?? '',
      amount: parseFloat(event.object?.amount?.value ?? '0'),
      metadata: { paid: event.object?.paid ?? false },
    };
  }

  async refund(params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    const shopId = process.env.YOOKASSA_SHOP_ID ?? '';
    const secretKey = process.env.YOOKASSA_SECRET_KEY ?? '';

    const body = {
      payment_id: params.providerPaymentId,
      amount: { value: params.amount.amount.toFixed(2), currency: params.amount.currency },
      description: params.reason,
    };

    const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const response = await fetch('https://api.yookassa.ru/v3/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'Idempotence-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json() as { id: string };
    return { success: true, providerRefundId: data.id };
  }
}
