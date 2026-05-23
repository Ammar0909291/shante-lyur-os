import { PromoCode } from '@/domain/entities';

export type PromoCodeRepositoryPort = IPromoCodeRepository;

export interface IPromoCodeRepository {
  findById(id: string): Promise<PromoCode | null>;
  findByCode(code: string): Promise<PromoCode | null>;
  findMany(options: {
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: PromoCode[]; total: number }>;
  create(promoCode: PromoCode): Promise<PromoCode>;
  update(promoCode: PromoCode): Promise<PromoCode>;
  delete(id: string): Promise<void>;
  recordUsage(promoCodeId: string, userId: string, appointmentId: string, discountAmount: number): Promise<void>;
  getUsageCount(promoCodeId: string): Promise<number>;
  getUsageCountByUser(promoCodeId: string, userId: string): Promise<number>;
}
