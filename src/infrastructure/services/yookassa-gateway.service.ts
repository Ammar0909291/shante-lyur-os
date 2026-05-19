import crypto from 'crypto';
import {
  IPaymentGateway,
  PaymentGatewayInitResult,
  PaymentGatewayVerifyResult,
} from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects/money.vo';

const YOOKASSA_BASE_URL = 'https://api.yookassa.ru/v3';

interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: { value: string; currency: string };
  confirmation?: { confirmation_url?: string };
}

interface YooKassaRefund {
  id: string;
  status: 'pending' | 'succeeded' | 'canceled';
}

type YooKassaProviderStatus = PaymentGatewayVerifyResult['providerStatus'];

export class YooKassaGateway implements IPaymentGateway {
  readonly name = 'YOOKASSA';

  private readonly shopId: string;
  private readonly secretKey: string;

  constructor() {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) {
      throw new Error('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY environment variables must be set');
    }
    this.shopId = shopId;
    this.secretKey = secretKey;
  }

  private authHeader(): string {
    const credentials = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    const idempotenceKey = crypto.randomUUID();

    const response = await fetch(`${YOOKASSA_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        amount: {
          value: params.amount.amount.toFixed(2),
          currency: params.amount.currency,
        },
        confirmation: {
          type: 'redirect',
          return_url: params.returnUrl,
        },
        capture: true,
        description: params.description,
        metadata: params.metadata ?? {},
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`YooKassa createPayment error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as YooKassaPayment;

    const paymentUrl = data.confirmation?.confirmation_url;
    if (!paymentUrl) {
      throw new Error('YooKassa did not return a confirmation URL');
    }

    return {
      paymentUrl,
      providerPaymentId: data.id,
    };
  }

  async verifyWebhook(payload: unknown, _signature: string): Promise<PaymentGatewayVerifyResult> {
    const notification = payload as {
      type?: string;
      event?: string;
      object?: { id?: string };
    };

    if (notification.type !== 'notification' || !notification.object?.id) {
      // Not a valid YooKassa notification structure
      return { success: false, providerPaymentId: '', amount: 0 };
    }

    const paymentId = notification.object.id;

    // Re-fetch the payment from YooKassa to verify authenticity — this prevents replay attacks
    // and forged webhooks since we are verifying against the provider's authoritative state.
    const response = await fetch(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, {
      headers: { Authorization: this.authHeader() },
    });

    if (!response.ok) {
      return { success: false, providerPaymentId: paymentId, amount: 0 };
    }

    const data = (await response.json()) as YooKassaPayment;

    const providerStatus = this.mapStatus(data.status);
    const amount = parseFloat(data.amount.value);

    return {
      success: data.status === 'succeeded',
      providerPaymentId: data.id,
      amount,
      providerStatus,
      metadata: {
        event: notification.event,
        yookassaStatus: data.status,
        currency: data.amount.currency,
      },
    };
  }

  async refund(params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    const idempotenceKey = crypto.randomUUID();

    const response = await fetch(`${YOOKASSA_BASE_URL}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        payment_id: params.providerPaymentId,
        amount: {
          value: params.amount.amount.toFixed(2),
          currency: params.amount.currency,
        },
        description: params.reason,
      }),
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = (await response.json()) as YooKassaRefund;
    return {
      success: data.status === 'succeeded' || data.status === 'pending',
      providerRefundId: data.id,
    };
  }

  private mapStatus(status: YooKassaPayment['status']): YooKassaProviderStatus {
    switch (status) {
      case 'succeeded': return 'succeeded';
      case 'canceled': return 'canceled';
      case 'pending': return 'pending';
      case 'waiting_for_capture': return 'pending';
      default: return 'pending';
    }
  }
}
