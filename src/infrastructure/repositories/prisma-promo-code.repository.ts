import { PrismaClient, Prisma } from '@prisma/client';
import { IPromoCodeRepository } from '@/application/ports/promo-code-repository.port';
import { PromoCode } from '@/domain/entities/promo-code.entity';
import { DiscountType } from '@/domain/enums/discount-type.enum';
import { Money } from '@/domain/value-objects/money.vo';

export class PrismaPromoCodeRepository implements IPromoCodeRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string; code: string; description: string | null; discountType: unknown;
    discountValue: { toNumber(): number }; maxUses: number | null; currentUses: number;
    maxUsesPerUser: number; minOrderAmount: { toNumber(): number } | null;
    validFrom: Date; validUntil: Date; applicableServices: unknown; isActive: boolean;
    createdBy: string; createdAt: Date; updatedAt: Date;
  }): PromoCode {
    return new PromoCode({
      id: raw.id,
      code: raw.code,
      description: raw.description ?? undefined,
      discountType: raw.discountType as DiscountType,
      discountValue: raw.discountValue.toNumber(),
      maxUses: raw.maxUses ?? undefined,
      currentUses: raw.currentUses,
      maxUsesPerUser: raw.maxUsesPerUser,
      minOrderAmount: raw.minOrderAmount ? Money.create(raw.minOrderAmount.toNumber()) : undefined,
      validFrom: raw.validFrom,
      validUntil: raw.validUntil,
      applicableServices: raw.applicableServices ? (raw.applicableServices as string[]) : undefined,
      isActive: raw.isActive,
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

  async findMany(options?: { isActive?: boolean; search?: string; page?: number; limit?: number }): Promise<{ items: PromoCode[]; total: number }> {
    const { isActive, search, page = 1, limit = 20 } = options ?? {};
    const where: Prisma.PromoCodeWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) where.code = { contains: search, mode: 'insensitive' };

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
        maxUses: pc.maxUses,
        currentUses: pc.currentUses,
        maxUsesPerUser: pc.maxUsesPerUser,
        minOrderAmount: pc.minOrderAmount?.amount,
        validFrom: pc.validFrom,
        validUntil: pc.validUntil,
        applicableServices: pc.applicableServices ? (pc.applicableServices as Prisma.InputJsonValue) : Prisma.JsonNull,
        isActive: pc.isActive,
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
        maxUses: pc.maxUses,
        currentUses: pc.currentUses,
        maxUsesPerUser: pc.maxUsesPerUser,
        minOrderAmount: pc.minOrderAmount?.amount,
        validFrom: pc.validFrom,
        validUntil: pc.validUntil,
        applicableServices: pc.applicableServices ? (pc.applicableServices as Prisma.InputJsonValue) : Prisma.JsonNull,
        isActive: pc.isActive,
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.promoCode.delete({ where: { id } });
  }

  async recordUsage(promoCodeId: string, userId: string, appointmentId: string, discountAmount: number): Promise<void> {
    await this.db.$transaction([
      this.db.promoCodeUsage.create({
        data: { promoCodeId, userId, appointmentId, discountAmount },
      }),
      this.db.promoCode.update({
        where: { id: promoCodeId },
        data: { currentUses: { increment: 1 } },
      }),
    ]);
  }

  async getUsageCount(promoCodeId: string): Promise<number> {
    return this.db.promoCodeUsage.count({ where: { promoCodeId } });
  }

  async getUsageCountByUser(promoCodeId: string, userId: string): Promise<number> {
    return this.db.promoCodeUsage.count({ where: { promoCodeId, userId } });
  }
}
