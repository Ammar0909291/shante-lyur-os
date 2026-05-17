import { NotFoundError, ForbiddenError } from '@/domain/errors';
import { UserRole } from '@/domain/enums';
import {
  ICustomerProfileRepository,
  IAuditLogRepository,
} from '@/application/ports';
import { UpdateCustomerProfileDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class UpdateCustomerProfileUseCase {
  constructor(
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(
    profileId: string,
    dto: UpdateCustomerProfileDto,
    actorId: string,
    actorRole: UserRole
  ) {
    const profile = await this.profileRepo.findById(profileId);
    if (!profile) {
      throw new NotFoundError('CustomerProfile', profileId);
    }

    // Clients can only update their own
    if (actorRole === UserRole.CLIENT && profile.userId !== actorId) {
      throw new ForbiddenError();
    }

    const oldValues: Record<string, unknown> = {};

    if (dto.dateOfBirth !== undefined) {
      oldValues.dateOfBirth = profile.dateOfBirth;
      (profile as any).props.dateOfBirth = dto.dateOfBirth;
    }
    if (dto.gender !== undefined) {
      oldValues.gender = profile.gender;
      (profile as any).props.gender = dto.gender;
    }
    if (dto.skinType !== undefined) {
      oldValues.skinType = profile.skinType;
      (profile as any).props.skinType = dto.skinType;
    }
    if (dto.hairType !== undefined) {
      oldValues.hairType = profile.hairType;
      (profile as any).props.hairType = dto.hairType;
    }
    if (dto.bodyType !== undefined) {
      oldValues.bodyType = profile.bodyType;
      (profile as any).props.bodyType = dto.bodyType;
    }
    if (dto.preferredLocationId !== undefined) {
      oldValues.preferredLocationId = profile.preferredLocationId;
      (profile as any).props.preferredLocationId = dto.preferredLocationId;
    }
    if (dto.preferredSpecialistId !== undefined) {
      oldValues.preferredSpecialistId = profile.preferredSpecialistId;
      (profile as any).props.preferredSpecialistId = dto.preferredSpecialistId;
    }
    if (dto.notes !== undefined) {
      oldValues.notes = profile.notes;
      (profile as any).props.notes = dto.notes;
    }

    profile.updatedAt = new Date();
    const saved = await this.profileRepo.update(profile);

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.UPDATE,
        entityType: 'CustomerProfile',
        entityId: saved.id,
        oldValues,
        newValues: dto,
      })
    );

    return { profile: saved };
  }
}
