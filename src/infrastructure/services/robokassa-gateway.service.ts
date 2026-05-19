import { createHash } from 'crypto';
import { PaymentGatewayPort } from '@/application/ports/payment-gateway.port';
import { PaymentStatus } from '@/domain/enums/payment-status.enum';

export class RobokassaGateway implements PaymentGatewayPort {
  private readonly merchantLogin = process.env.ROBOKASSA_MERCHANT_LOGIN ?? '';
  private readonly password1 = process.env.ROBOKASSA_PASSWORD1 ?? '';
  private readonly password2 = process.env.ROBOKASSA_PASSWORD2 ?? '';

  async createPayment(params: {
    appointmentId: string;
    amount: number;
    currency: string;
    description: string;
    returnUrl: string;
    idempotencyKey?: string;
  }): Promise<{ providerPaymentId: string; status: PaymentStatus; redirectUrl?: string }> {
    if (!this.merchantLogin || !this.password1) {
      throw new Error('Robokassa credentials not configured (ROBOKASSA_MERCHANT_LOGIN, ROBOKASSA_PASSWORD1)');
    }

    const invId = Date.now();
    const sig = createHash('md5')
      .update(`${this.merchantLogin}:${params.amount.toFixed(2)}:${invId}:${this.password1}`)
      .digest('hex');

    const url = new URL('https://auth.robokassa.ru/Merchant/Index.aspx');
    url.searchParams.set('MerchantLogin', this.merchantLogin);
    url.searchParams.set('OutSum', params.amount.toFixed(2));
    url.searchParams.set('InvId', String(invId));
    url.searchParams.set('Description', params.description);
    url.searchParams.set('SignatureValue', sig);
    url.searchParams.set('Culture', 'ru');

    return {
      providerPaymentId: String(invId),
      status: PaymentStatus.PENDING,
      redirectUrl: url.toString(),
    };
  }

  async verifyWebhook(
    payload: unknown,
    _signature?: string,
  ): Promise<{ paid: boolean; providerPaymentId: string; status: PaymentStatus }> {
    const body = payload as Record<string, string>;
    const invId = body?.InvId ?? '';
    const outSum = body?.OutSum ?? '';
    const sigCheck = createHash('md5')
      .update(`${outSum}:${invId}:${this.password2}`)
      .digest('hex')
      .toUpperCase();
    const sigReceived = (body?.SignatureValue ?? '').toUpperCase();
    const paid = sigCheck === sigReceived;
    return { paid, providerPaymentId: invId, status: paid ? PaymentStatus.CAPTURED : PaymentStatus.FAILED };
  }

  async refund(
    _providerPaymentId: string,
    _amount: number,
  ): Promise<{ status: PaymentStatus }> {
    // Robokassa does not support programmatic refunds via API — must be done via merchant dashboard
    throw new Error('Robokassa refunds must be processed manually via the merchant dashboard');
  }
}
