import {
  ISessionRepository,
  IRefreshTokenRepository,
  IAuditLogRepository,
} from '@/application/ports';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class LogoutUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(userId: string, sessionToken?: string, refreshToken?: string, ipAddress?: string): Promise<void> {
    if (sessionToken) {
      await this.sessionRepo.deleteByToken(sessionToken);
    }
    if (refreshToken) {
      await this.refreshTokenRepo.revokeAllForUser(userId);
    }

    await this.auditLogRepo.create(
      AuditLog.create({
        userId,
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: userId,
        ipAddress,
      })
    );
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.sessionRepo.deleteByUser(userId);
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
