import { Refund } from '@/domain/entities';
import { RefundStatus } from '@/domain/enums';

export interface IRefundRepository {
  findById(id: string): Promise<Refund | null>;
  findByPaymentId(paymentId: string): Promise<Refund[]>;
  findMany(options: {
    status?: RefundStatus;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ items: Refund[]; total: number }>;
  create(refund: Refund): Promise<Refund>;
  update(refund: Refund): Promise<Refund>;
}
