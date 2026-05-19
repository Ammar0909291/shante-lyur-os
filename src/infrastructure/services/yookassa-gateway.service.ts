import { PaymentGatewayPort } from '@/application/ports/payment-gateway.port';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';

export class YooKassaGateway implements PaymentGatewayPort {
  private readonly shopId = process.env.YOOKASSA_SHOP_ID ?? '';
  private readonly secretKey = process.env.YOOKASSA_SECRET_KEY ?? '';

  async createPayment(params: {
    appointmentId: string;
    amount: number;
    currency: string;
    description: string;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<{ providerPaymentId: string; status: PaymentStatus; redirectUrl?: string }> {
    if (!this.shopId || !this.secretKey) {
      throw new Error('YooKassa credentials not configured (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)');
    }

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': params.idempotencyKey ?? crypto.randomUUID(),
        Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: { value: params.amount.toFixed(2), currency: params.currency },
        description: params.description,
        confirmation: { type: 'redirect', return_url: params.returnUrl },
        metadata: { appointmentId: params.appointmentId },
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
      status: PaymentStatus.PENDING,
      redirectUrl: data.confirmation?.confirmation_url,
    };
  }

  async verifyWebhook(
    payload: unknown,
    _signature?: string,
  ): Promise<{ paid: boolean; providerPaymentId: string; status: PaymentStatus }> {
    const body = payload as { object?: { id?: string; status?: string; paid?: boolean } };
    const obj = body?.object ?? {};
    const paid = obj.paid === true || obj.status === 'succeeded';
    const status = paid ? PaymentStatus.CAPTURED : PaymentStatus.FAILED;
    return { paid, providerPaymentId: obj.id ?? '', status };
  }

  async refund(
    providerPaymentId: string,
    amount: number,
  ): Promise<{ status: PaymentStatus }> {
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
        payment_id: providerPaymentId,
        amount: { value: amount.toFixed(2), currency: 'RUB' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`YooKassa refund failed: ${err}`);
    }

    return { status: PaymentStatus.FULLY_REFUNDED };
  }
}
