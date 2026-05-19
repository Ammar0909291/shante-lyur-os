import { User, RefreshToken } from '@/domain/entities';
import { UnauthorizedError } from '@/domain/errors';
import { Email } from '@/domain/value-objects';
import {
  IUserRepository,
  IRefreshTokenRepository,
  IPasswordHasher,
  ITokenService,
  IAuditLogRepository,
} from '@/application/ports';
import { LoginDto } from '@/application/dto';
import { AuditAction } from '@/domain/enums';
import { AuditLog } from '@/domain/entities';

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const email = Email.create(dto.email);
    const user = await this.userRepo.findByEmail(email.value);

    if (!user) {
      await this.auditLogRepo.create(
        AuditLog.create({
          action: AuditAction.LOGIN_FAILED,
          entityType: 'User',
          ipAddress,
          userAgent,
          metadata: { email: email.value, reason: 'user_not_found' },
        })
      );
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.isLocked) {
      await this.auditLogRepo.create(
        AuditLog.create({
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          entityType: 'User',
          entityId: user.id,
          ipAddress,
          userAgent,
          metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil },
        })
      );
      throw new UnauthorizedError(`Account locked until ${user.lockedUntil?.toISOString()}`);
    }

    const valid = await this.passwordHasher.verify(dto.password, user.passwordHash);
    if (!valid) {
      user.recordFailedLogin();
      await this.userRepo.update(user);

      await this.auditLogRepo.create(
        AuditLog.create({
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          entityType: 'User',
          entityId: user.id,
          ipAddress,
          userAgent,
          metadata: { reason: 'invalid_password', failedAttempts: user.failedLogins },
        })
      );
      throw new UnauthorizedError('Invalid credentials');
    }

    user.recordLogin();
    await this.userRepo.update(user);

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refreshTokenStr = await this.tokenService.generateRefreshToken({
      sub: user.id,
      version: Date.now(),
    });

    const refreshToken = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: await this.passwordHasher.hash(refreshTokenStr),
      expiresAt: new Date(Date.now() + (dto.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      ipAddress,
      createdAt: new Date(),
    });

    await this.refreshTokenRepo.create(refreshToken);

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      })
    );

    return { user, accessToken, refreshToken: refreshTokenStr };
  }
}
