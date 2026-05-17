export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FULLY_REFUNDED = 'FULLY_REFUNDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const TERMINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.CAPTURED,
  PaymentStatus.FULLY_REFUNDED,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
  PaymentStatus.EXPIRED,
];

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL_PAYMENT_STATUSES.includes(status);
}
