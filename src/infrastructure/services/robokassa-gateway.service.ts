import { IPaymentGateway, PaymentGatewayInitResult, PaymentGatewayVerifyResult } from '@/application/ports/payment-gateway.port';
import { Money } from '@/domain/value-objects/money.vo';
import crypto from 'crypto';

export class RobokassaGateway implements IPaymentGateway {
  name = 'robokassa';

  private readonly merchantLogin: string;
  private readonly password1: string;
  private readonly password2: string;
  private readonly testMode: boolean;

  constructor() {
    this.merchantLogin = process.env.ROBOKASSA_MERCHANT_LOGIN ?? '';
    this.password1 = process.env.ROBOKASSA_PASSWORD1 ?? '';
    this.password2 = process.env.ROBOKASSA_PASSWORD2 ?? '';
    this.testMode = process.env.ROBOKASSA_TEST_MODE === 'true';
  }

  async createPayment(params: {
    amount: Money;
    description: string;
    orderId: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentGatewayInitResult> {
    const outSum = params.amount.amount.toFixed(2);
    const invId = params.orderId;
    const signature = crypto
      .createHash('md5')
      .update(`${this.merchantLogin}:${outSum}:${invId}:${this.password1}`)
      .digest('hex');

    const base = 'https://auth.robokassa.ru/Merchant/Index.aspx';

    const url = new URL(base);
    url.searchParams.set('MerchantLogin', this.merchantLogin);
    url.searchParams.set('OutSum', outSum);
    url.searchParams.set('InvId', invId);
    url.searchParams.set('Description', params.description);
    url.searchParams.set('SignatureValue', signature);
    if (this.testMode) url.searchParams.set('IsTest', '1');

    return {
      paymentUrl: url.toString(),
      providerPaymentId: invId,
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<PaymentGatewayVerifyResult> {
    const params = payload as Record<string, string>;
    const outSum = params['OutSum'] ?? '0';
    const invId = params['InvId'] ?? '';
    const signatureValue = params['SignatureValue'] ?? '';

    const expected = crypto
      .createHash('md5')
      .update(`${outSum}:${invId}:${this.password2}`)
      .digest('hex')
      .toUpperCase();

    const success = expected === signatureValue.toUpperCase();

    return {
      success,
      providerPaymentId: invId,
      amount: parseFloat(outSum),
    };
  }

  async refund(params: {
    providerPaymentId: string;
    amount: Money;
    reason?: string;
  }): Promise<{ success: boolean; providerRefundId?: string }> {
    // Robokassa does not support API refunds — must be done manually in merchant panel
    throw new Error('Robokassa refunds must be processed through the merchant panel');
  }
}
