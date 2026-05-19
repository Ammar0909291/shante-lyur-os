import { PrismaClient, Prisma } from '@prisma/client';
import { IPromoCodeRepository } from '@/application/ports/promo-code-repository.port';
import { PromoCode } from '@/domain/entities/promo-code.entity';
import { DiscountType } from '@/domain/enums/discount-type.enum';
import { Money } from '@/domain/value-objects/money.vo';

type RawPromoCode = {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number | { toNumber(): number };
  maxUses: number | null;
  currentUses: number;
  maxUsesPerUser: number;
  minOrderAmount: number | { toNumber(): number } | null;
  validFrom: Date;
  validUntil: Date;
  applicableServices: unknown;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaPromoCodeRepository implements IPromoCodeRepository {
  constructor(private readonly db: PrismaClient) {}

  private toNum(val: number | { toNumber(): number }): number {
    return typeof val === 'number' ? val : val.toNumber();
  }

  private toDomain(raw: RawPromoCode): PromoCode {
    return new PromoCode({
      id: raw.id,
      code: raw.code,
      description: raw.description ?? undefined,
      discountType: raw.discountType as DiscountType,
      discountValue: this.toNum(raw.discountValue),
      maxUses: raw.maxUses ?? undefined,
      currentUses: raw.currentUses,
      maxUsesPerUser: raw.maxUsesPerUser,
      minOrderAmount: raw.minOrderAmount != null ? Money.create(this.toNum(raw.minOrderAmount as number | { toNumber(): number })) : undefined,
      validFrom: raw.validFrom,
      validUntil: raw.validUntil,
      applicableServices: Array.isArray(raw.applicableServices) ? raw.applicableServices as string[] : undefined,
      isActive: raw.isActive,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<PromoCode | null> {
    const raw = await this.db.promoCode.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawPromoCode) : null;
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    const raw = await this.db.promoCode.findUnique({ where: { code } });
    return raw ? this.toDomain(raw as unknown as RawPromoCode) : null;
  }

  async findMany(options?: { isActive?: boolean; search?: string; page?: number; limit?: number }): Promise<{ items: PromoCode[]; total: number }> {
    const { isActive, page = 1, limit = 20 } = options ?? {};
    const where: Prisma.PromoCodeWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [raws, total] = await Promise.all([
      this.db.promoCode.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.promoCode.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r as unknown as RawPromoCode)), total };
  }

  async create(pc: PromoCode): Promise<PromoCode> {
    const raw = await this.db.promoCode.create({
      data: {
        id: pc.id,
        code: pc.code,
        description: pc.description,
        discountType: pc.discountType,
        discountValue: pc.discountValue,
        minOrderAmount: pc.minOrderAmount?.amount,
        maxUses: pc.maxUses,
        currentUses: pc.currentUses,
        maxUsesPerUser: pc.maxUsesPerUser,
        validFrom: pc.validFrom,
        validUntil: pc.validUntil,
        applicableServices: pc.applicableServices ?? Prisma.JsonNull,
        isActive: pc.isActive,
        createdBy: pc.createdBy,
      },
    });
    return this.toDomain(raw as unknown as RawPromoCode);
  }

  async update(pc: PromoCode): Promise<PromoCode> {
    const raw = await this.db.promoCode.update({
      where: { id: pc.id },
      data: {
        code: pc.code,
        description: pc.description,
        discountType: pc.discountType,
        discountValue: pc.discountValue,
        minOrderAmount: pc.minOrderAmount?.amount,
        maxUses: pc.maxUses,
        currentUses: pc.currentUses,
        maxUsesPerUser: pc.maxUsesPerUser,
        validFrom: pc.validFrom,
        validUntil: pc.validUntil,
        applicableServices: pc.applicableServices ?? Prisma.JsonNull,
        isActive: pc.isActive,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw as unknown as RawPromoCode);
  }

  async delete(id: string): Promise<void> {
    await this.db.promoCode.delete({ where: { id } });
  }

  async recordUsage(promoCodeId: string, _userId: string, _appointmentId: string, _discountAmount: number): Promise<void> {
    await this.db.promoCode.update({
      where: { id: promoCodeId },
      data: { currentUses: { increment: 1 } },
    });
  }

  async getUsageCount(promoCodeId: string): Promise<number> {
    const raw = await this.db.promoCode.findUnique({
      where: { id: promoCodeId },
      select: { currentUses: true },
    });
    return raw?.currentUses ?? 0;
  }

  async getUsageCountByUser(_promoCodeId: string, _userId: string): Promise<number> {
    // The schema doesn't track per-user usage separately; return 0 as placeholder
    return 0;
  }
}
