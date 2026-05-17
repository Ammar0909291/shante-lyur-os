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

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
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

    const accessToken = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refreshToken = await this.tokenService.generateRefreshToken({ userId: user.id });

    const refreshTokenEntity = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(refreshTokenEntity);

    const sessionEntity = new Session({
      id: crypto.randomUUID(),
      userId: user.id,
      token: refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    await this.sessionRepo.create(sessionEntity);

    return {
      user,
      accessToken,
      refreshToken,
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

  async refreshAccessToken(refreshTokenValue: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.tokenService.verifyRefreshToken(refreshTokenValue);
    const userId = payload.userId as string;

    const stored = await this.refreshTokenRepo.findByTokenHash(refreshTokenValue);
    if (!stored || stored.isRevoked || stored.isExpired) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    await this.refreshTokenRepo.revoke(stored.id);

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const accessToken = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.value,
      role: user.role,
    });

    const newRefreshToken = await this.tokenService.generateRefreshToken({ userId: user.id });

    const newRefreshTokenEntity = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(newRefreshTokenEntity);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
