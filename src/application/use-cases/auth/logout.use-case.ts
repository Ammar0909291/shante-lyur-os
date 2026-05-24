import { createHash } from 'crypto';
import {
  ISessionRepository,
  IRefreshTokenRepository,
  IAuditLogRepository,
} from '@/application/ports';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

function sha256Token(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export class LogoutUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(userId: string, sessionToken?: string, refreshToken?: string, ipAddress?: string): Promise<void> {
    if (sessionToken) {
      try { await this.sessionRepo.deleteByToken(sessionToken); } catch {}
    }

    if (refreshToken) {
      try {
        const hash = sha256Token(refreshToken);
        const stored = await this.refreshTokenRepo.findByTokenHash(hash);
        if (stored && !stored.isRevoked) {
          stored.revoke();
          await this.refreshTokenRepo.update(stored);
        }
      } catch {}
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
