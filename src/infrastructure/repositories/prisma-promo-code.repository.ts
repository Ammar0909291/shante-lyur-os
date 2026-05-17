import { PrismaClient, Prisma } from '@prisma/client';
import { PromoCodeRepositoryPort } from '@/application/ports/promo-code-repository.port';
import { PromoCode } from '@/domain/entities/promo-code.entity';
import { DiscountType } from '@/domain/enums/discount-type.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaPromoCodeRepository implements PromoCodeRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; code: string; description: string | null; discountType: string; discountValue: number; minOrderAmount: number | null; maxUses: number | null; usedCount: number; validFrom: Date; validUntil: Date | null; isActive: boolean; applicableServiceIds: string[]; createdBy: string; createdAt: Date; updatedAt: Date }): PromoCode {
    return PromoCode.reconstitute({
      id: raw.id,
      code: raw.code,
      description: raw.description ?? undefined,
      discountType: raw.discountType as DiscountType,
      discountValue: raw.discountValue,
      minOrderAmount: raw.minOrderAmount ? Money.create(raw.minOrderAmount).getValue() : undefined,
      maxUses: raw.maxUses ?? undefined,
      usedCount: raw.usedCount,
      validFrom: raw.validFrom,
      validUntil: raw.validUntil ?? undefined,
      isActive: raw.isActive,
      applicableServiceIds: raw.applicableServiceIds,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findById(id: string): Promise<PromoCode | null> {
    const raw = await this.db.promoCode.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    const raw = await this.db.promoCode.findUnique({ where: { code } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options?: { isActive?: boolean; page?: number; limit?: number }): Promise<{ items: PromoCode[]; total: number }> {
    const { isActive, page = 1, limit = 20 } = options ?? {};
    const where: Prisma.PromoCodeWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [raws, total] = await Promise.all([
      this.db.promoCode.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.promoCode.count({ where }),
    ]);
    return { items: raws.map(r => this.toDomain(r)), total };
  }

  async create(pc: PromoCode): Promise<PromoCode> {
    const raw = await this.db.promoCode.create({
      data: {
        id: pc.id,
        code: pc.code,
        description: pc.description,
        discountType: pc.discountType,
        discountValue: pc.discountValue,
        minOrderAmount: pc.minOrderAmount,
        maxUses: pc.maxUses,
        usedCount: pc.usedCount,
        validFrom: pc.validFrom,
        validUntil: pc.validUntil,
        isActive: pc.isActive,
        applicableServiceIds: pc.applicableServiceIds,
        createdBy: pc.createdBy,
      },
    });
    return this.toDomain(raw);
  }

  async update(pc: PromoCode): Promise<PromoCode> {
    const raw = await this.db.promoCode.update({
      where: { id: pc.id },
      data: {
        code: pc.code,
        description: pc.description,
        discountType: pc.discountType,
        discountValue: pc.discountValue,
        minOrderAmount: pc.minOrderAmount,
        maxUses: pc.maxUses,
        usedCount: pc.usedCount,
        validFrom: pc.validFrom,
        validUntil: pc.validUntil,
        isActive: pc.isActive,
        applicableServiceIds: pc.applicableServiceIds,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.promoCode.delete({ where: { id } });
  }

  async incrementUsage(id: string): Promise<void> {
    await this.db.promoCode.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }
}
