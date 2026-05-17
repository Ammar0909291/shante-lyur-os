import { CustomerProfile } from '@/domain/entities';
import { ConflictError, NotFoundError } from '@/domain/errors';
import { Money } from '@/domain/value-objects';
import {
  ICustomerProfileRepository,
  IUserRepository,
  IAuditLogRepository,
} from '@/application/ports';
import { CreateCustomerProfileDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class CreateCustomerProfileUseCase {
  constructor(
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly userRepo: IUserRepository,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(dto: CreateCustomerProfileDto, actorId: string) {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new NotFoundError('User', dto.userId);
    }

    const existing = await this.profileRepo.findByUserId(dto.userId);
    if (existing) {
      throw new ConflictError('Customer profile already exists for this user', 'userId');
    }

    const profile = new CustomerProfile({
      id: crypto.randomUUID(),
      userId: dto.userId,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      skinType: dto.skinType,
      hairType: dto.hairType,
      bodyType: dto.bodyType,
      preferredLocationId: dto.preferredLocationId,
      preferredSpecialistId: dto.preferredSpecialistId,
      referralSource: dto.referralSource,
      totalVisits: 0,
      totalSpent: Money.zero('RUB'),
      loyaltyPoints: 0,
      loyaltyTier: 'BRONZE',
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.profileRepo.create(profile);

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.CREATE,
        entityType: 'CustomerProfile',
        entityId: saved.id,
        newValues: { userId: saved.userId },
      })
    );

    return { profile: saved };
  }
}
