import crypto from 'crypto';
import {
  IPaymentGateway,
  PaymentGatewayInitResult,
  PaymentGatewayVerifyResult,
} from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects/money.vo';

const ROBOKASSA_PAYMENT_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

export class RobokassaGateway implements IPaymentGateway {
  readonly name = 'ROBOKASSA';

  private readonly merchantLogin: string;
  private readonly password1: string;
  private readonly password2: string;

  constructor() {
    const merchantLogin = process.env.ROBOKASSA_MERCHANT_LOGIN;
    const password1 = process.env.ROBOKASSA_PASSWORD1;
    const password2 = process.env.ROBOKASSA_PASSWORD2;
    if (!merchantLogin || !password1 || !password2) {
      throw new Error(
        'ROBOKASSA_MERCHANT_LOGIN, ROBOKASSA_PASSWORD1, and ROBOKASSA_PASSWORD2 environment variables must be set'
      );
    }
    this.merchantLogin = merchantLogin;
    this.password1 = password1;
    this.password2 = password2;
  }

  async createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    // Robokassa InvId must be a positive 32-bit integer unique per merchant
    // Derive a stable numeric ID from the UUID orderId using a hex-to-int hash
    const invId = this.orderIdToInvId(params.orderId);
    const outSum = params.amount.amount.toFixed(2);

    // Signature: MD5(MerchantLogin:OutSum:InvId:Password1)
    const signatureInput = `${this.merchantLogin}:${outSum}:${invId}:${this.password1}`;
    const signature = crypto
      .createHash('md5')
      .update(signatureInput)
      .digest('hex')
      .toUpperCase();

    const url = new URL(ROBOKASSA_PAYMENT_URL);
    url.searchParams.set('MrchLogin', this.merchantLogin);
    url.searchParams.set('OutSum', outSum);
    url.searchParams.set('InvId', String(invId));
    url.searchParams.set('Description', params.description.slice(0, 100));
    url.searchParams.set('SignatureValue', signature);
    url.searchParams.set('Culture', 'ru');
    url.searchParams.set('Encoding', 'utf-8');
    url.searchParams.set('IsTest', process.env.NODE_ENV !== 'production' ? '1' : '0');

    return {
      paymentUrl: url.toString(),
      // Store invId as providerPaymentId so webhook lookup can match it
      providerPaymentId: String(invId),
    };
  }

  async verifyWebhook(payload: unknown, _signature: string): Promise<PaymentGatewayVerifyResult> {
    const data = payload as Record<string, string>;

    const outSum = data['OutSum'] ?? data['outSum'] ?? '';
    const invId = data['InvId'] ?? data['invId'] ?? '';
    const receivedSig = data['SignatureValue'] ?? data['signatureValue'] ?? '';

    if (!outSum || !invId || !receivedSig) {
      return { success: false, providerPaymentId: '', amount: 0 };
    }

    // Verify result URL signature: MD5(OutSum:InvId:Password2)
    const signatureInput = `${outSum}:${invId}:${this.password2}`;
    const expectedSig = crypto
      .createHash('md5')
      .update(signatureInput)
      .digest('hex')
      .toUpperCase();

    if (receivedSig.toUpperCase() !== expectedSig) {
      // Signature mismatch — reject without revealing expected value
      return { success: false, providerPaymentId: invId, amount: 0 };
    }

    return {
      success: true,
      providerPaymentId: invId,
      amount: parseFloat(outSum),
      providerStatus: 'succeeded',
      metadata: { invId, outSum, paymentMethod: data['PaymentMethod'] ?? '' },
    };
  }

  async refund(_params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    // Robokassa does not provide an automated refund API in its standard integration.
    // Refunds must be initiated manually via the Robokassa merchant dashboard.
    return { success: false };
  }

  private orderIdToInvId(orderId: string): number {
    // Convert UUID to a stable positive 31-bit integer for Robokassa InvId
    const hex = orderId.replace(/-/g, '').slice(0, 8);
    return (parseInt(hex, 16) & 0x7fffffff) || 1;
  }
}
