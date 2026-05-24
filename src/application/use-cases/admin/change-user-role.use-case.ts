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
    // Only SUPER_ADMIN can change roles; ADMIN cannot promote to SUPER_ADMIN
    if (actorRole !== UserRole.SUPER_ADMIN && dto.newRole === UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can grant SUPER_ADMIN role');
    }

    const targetUser = await this.userRepo.findById(dto.userId);
    if (!targetUser) {
      throw new NotFoundError('User', dto.userId);
    }

    const oldRole = targetUser.role;

    // Last-SUPER_ADMIN guard: if target is SUPER_ADMIN and new role is different,
    // ensure at least one other SUPER_ADMIN exists (entity.changeRole also blocks
    // demotion entirely, but this provides a clear count-based error message).
    if (oldRole === UserRole.SUPER_ADMIN && dto.newRole !== UserRole.SUPER_ADMIN) {
      const superAdminCount = await this.userRepo.countByRole(UserRole.SUPER_ADMIN);
      if (superAdminCount <= 1) {
        throw new ForbiddenError('Cannot remove the last SUPER_ADMIN from the system');
      }
    }

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
