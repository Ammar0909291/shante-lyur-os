import { IAuthService, AuthResult } from '@/application/ports/auth-service.port';
import { IUserRepository } from '@/application/ports/user-repository.port';
import { IPasswordHasher } from '@/application/ports/password-hasher.port';
import { ITokenService } from '@/application/ports/token-service.port';
import { IRefreshTokenRepository } from '@/application/ports/refresh-token-repository.port';
import { ISessionRepository } from '@/application/ports/session-repository.port';
import { User } from '@/domain/entities/user.entity';
import { RefreshToken } from '@/domain/entities/refresh-token.entity';
import { Session } from '@/domain/entities/session.entity';
import { Email } from '@/domain/value-objects/email.vo';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';
import { ConflictError } from '@/domain/errors/conflict-error';
import { NotFoundError } from '@/domain/errors/not-found-error';
import { UserRole } from '@/domain/enums/user-role.enum';
import { UserStatus } from '@/domain/enums/user-status.enum';
import * as crypto from 'crypto';

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async authenticate(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid credentials');
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedError('Account is suspended');
    if (user.status === UserStatus.INACTIVE) throw new UnauthorizedError('Account is inactive');

    const valid = await this.passwordHasher.verify(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    user.recordLogin();
    await this.userRepo.update(user);

    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
    const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    const accessToken = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refreshTokenString = await this.tokenService.generateRefreshToken({ userId: user.id });

    const refreshTokenEntity = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: hashToken(refreshTokenString),
      expiresAt: refreshTokenExpiresAt,
      createdAt: now,
    });
    await this.refreshTokenRepo.create(refreshTokenEntity);

    const session = new Session({
      id: crypto.randomUUID(),
      userId: user.id,
      token: hashToken(refreshTokenString),
      ipAddress,
      userAgent,
      expiresAt: refreshTokenExpiresAt,
      createdAt: now,
    });
    await this.sessionRepo.create(session);

    return {
      user,
      accessToken,
      refreshToken: refreshTokenString,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
  }): Promise<User> {
    const exists = await this.userRepo.exists(data.email);
    if (exists) throw new ConflictError('User with this email already exists');

    const passwordHash = await this.passwordHasher.hash(data.password);

    const user = User.reconstitute({
      id: crypto.randomUUID(),
      email: Email.create(data.email),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role ?? UserRole.CLIENT,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerified: false,
      phoneVerified: false,
      failedLogins: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.userRepo.create(user);
  }

  async refreshAccessToken(currentRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }> {
    const payload = await this.tokenService.verifyRefreshToken(currentRefreshToken);
    const userId = payload.userId as string;

    const stored = await this.refreshTokenRepo.findByTokenHash(hashToken(currentRefreshToken));
    if (!stored || stored.isRevoked || stored.isExpired) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    stored.revoke();
    await this.refreshTokenRepo.update(stored);

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
    const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    const accessToken = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.value,
      role: user.role,
    });

    const newRefreshTokenString = await this.tokenService.generateRefreshToken({ userId: user.id });

    const newRefreshTokenEntity = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: hashToken(newRefreshTokenString),
      expiresAt: refreshTokenExpiresAt,
      createdAt: now,
    });
    await this.refreshTokenRepo.create(newRefreshTokenEntity);

    return {
      accessToken,
      refreshToken: newRefreshTokenString,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokenRepo.findByTokenHash(hashToken(refreshToken));
    if (stored) {
      stored.revoke();
      await this.refreshTokenRepo.update(stored);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
