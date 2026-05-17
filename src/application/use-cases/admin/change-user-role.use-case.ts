import { UserRole } from '@/domain/enums';
import { NotFoundError, ForbiddenError } from '@/domain/errors';
import { UserRoleChangedEvent } from '@/domain/events';
import {
  IUserRepository,
  IAuditLogRepository,
  IEventBus,
} from '@/application/ports';
import { ChangeRoleDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class ChangeUserRoleUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditLogRepo: IAuditLogRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: ChangeRoleDto, actorId: string, actorRole: UserRole) {
    const targetUser = await this.userRepo.findById(dto.userId);
    if (!targetUser) {
      throw new NotFoundError('User', dto.userId);
    }

    const oldRole = targetUser.role;

    targetUser.changeRole(dto.newRole as UserRole, actorRole, actorId);
    const saved = await this.userRepo.update(targetUser);

    await this.eventBus.publish(
      new UserRoleChangedEvent(saved.id, {
        oldRole,
        newRole: saved.role,
        changedBy: actorId,
      })
    );

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.ROLE_CHANGED,
        entityType: 'User',
        entityId: saved.id,
        oldValues: { role: oldRole },
        newValues: { role: saved.role },
      })
    );

    return { user: saved, oldRole, newRole: saved.role };
  }
}
