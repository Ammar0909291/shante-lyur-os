import { IAuthService, AuthResult } from '@/application/ports/auth-service.port';
import { IUserRepository } from '@/application/ports/user-repository.port';
import { IPasswordHasher } from '@/application/ports/password-hasher.port';
import { ITokenService } from '@/application/ports/token-service.port';
import { IRefreshTokenRepository } from '@/application/ports/refresh-token-repository.port';
import { ISessionRepository } from '@/application/ports/session-repository.port';
import { User } from '@/domain/entities/user.entity';
import { RefreshToken } from '@/domain/entities/refresh-token.entity';
import { Session } from '@/domain/entities/session.entity';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';
import { ConflictError } from '@/domain/errors/conflict-error';
import { NotFoundError } from '@/domain/errors/not-found-error';
import { UserRole } from '@/domain/enums/user-role.enum';
import { UserStatus } from '@/domain/enums/user-status.enum';
import { Email } from '@/domain/value-objects/email.vo';

const ACCESS_TOKEN_EXPIRES_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
    if (!valid) {
      user.recordFailedLogin();
      await this.userRepo.update(user);
      throw new UnauthorizedError('Invalid credentials');
    }

    user.recordLogin();
    await this.userRepo.update(user);

    const accessTokenStr = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refreshTokenStr = await this.tokenService.generateRefreshToken({
      sub: user.id,
      version: Date.now(),
    });

    const refreshTokenHash = await this.passwordHasher.hash(refreshTokenStr);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    const refreshTokenEntity = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
      ipAddress,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(refreshTokenEntity);

    const sessionToken = crypto.randomUUID();
    const session = new Session({
      id: crypto.randomUUID(),
      userId: user.id,
      token: sessionToken,
      ipAddress,
      userAgent,
      expiresAt: refreshTokenExpiresAt,
      createdAt: new Date(),
    });
    await this.sessionRepo.create(session);

    return {
      user,
      accessToken: accessTokenStr,
      refreshToken: refreshTokenStr,
      accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRES_MS),
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

    const user = new User({
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

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const userId = payload['sub'] as string;

    const tokenHash = await this.passwordHasher.hash(refreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (!stored || stored.isRevoked || stored.isExpired) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    await this.refreshTokenRepo.revoke(stored.id);

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const accessTokenStr = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const newRefreshTokenStr = await this.tokenService.generateRefreshToken({
      sub: user.id,
      version: Date.now(),
    });

    const newRefreshTokenHash = await this.passwordHasher.hash(newRefreshTokenStr);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    const newRefreshToken = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(newRefreshToken);

    return {
      accessToken: accessTokenStr,
      refreshToken: newRefreshTokenStr,
      accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRES_MS),
      refreshTokenExpiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = await this.passwordHasher.hash(refreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (stored) {
      await this.refreshTokenRepo.revoke(stored.id);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
