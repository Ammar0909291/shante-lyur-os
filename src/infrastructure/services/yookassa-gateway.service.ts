import { IPaymentGateway, PaymentGatewayInitResult, PaymentGatewayVerifyResult } from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects/money.vo';

export class YooKassaGateway implements IPaymentGateway {
  readonly name = 'YOOKASSA';
  private readonly shopId = process.env.YOOKASSA_SHOP_ID ?? '';
  private readonly secretKey = process.env.YOOKASSA_SECRET_KEY ?? '';

  async createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    if (!this.shopId || !this.secretKey) {
      throw new Error('YooKassa credentials not configured (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)');
    }

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': params.metadata?.idempotencyKey as string ?? crypto.randomUUID(),
        Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: { value: params.amount.amount.toFixed(2), currency: params.amount.currency },
        description: params.description,
        confirmation: { type: 'redirect', return_url: params.returnUrl },
        metadata: { orderId: params.orderId, ...params.metadata },
        capture: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`YooKassa createPayment failed: ${err}`);
    }

    const data = await response.json();
    return {
      providerPaymentId: data.id,
      paymentUrl: data.confirmation?.confirmation_url ?? '',
    };
  }

  async verifyWebhook(
    payload: unknown,
    _signature: string,
  ): Promise<PaymentGatewayVerifyResult> {
    const body = payload as { object?: { id?: string; status?: string; paid?: boolean; amount?: { value?: string } } };
    const obj = body?.object ?? {};
    const paid = obj.paid === true || obj.status === 'succeeded';
    const success = paid;
    const amount = parseFloat(obj.amount?.value ?? '0');
    return { success, providerPaymentId: obj.id ?? '', amount };
  }

  async refund(params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    if (!this.shopId || !this.secretKey) {
      throw new Error('YooKassa credentials not configured');
    }

    const response = await fetch('https://api.yookassa.ru/v3/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': crypto.randomUUID(),
        Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        payment_id: params.providerPaymentId,
        amount: { value: params.amount.amount.toFixed(2), currency: params.amount.currency },
        description: params.reason,
      }),
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return { success: true, providerRefundId: data.id };
  }
}
