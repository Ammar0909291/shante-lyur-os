import { IUserRepository } from '@/application/ports/user-repository.port';
import { IPasswordHasher } from '@/application/ports/password-hasher.port';
import { IRefreshTokenRepository } from '@/application/ports/refresh-token-repository.port';
import { ISessionRepository } from '@/application/ports/session-repository.port';
import { JwtTokenService } from './jwt-token.service';
import { User } from '@/domain/entities/user.entity';
import { RefreshToken } from '@/domain/entities/refresh-token.entity';
import { Session } from '@/domain/entities/session.entity';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';
import { ConflictError } from '@/domain/errors/conflict-error';
import { NotFoundError } from '@/domain/errors/not-found-error';
import { UserRole } from '@/domain/enums/user-role.enum';
import { UserStatus } from '@/domain/enums/user-status.enum';
import { Email } from '@/domain/value-objects/email.vo';
import { PhoneNumber } from '@/domain/value-objects/phone-number.vo';

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: JwtTokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async authenticate(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid credentials');
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedError('Account is blocked');
    if (user.status === UserStatus.INACTIVE) throw new UnauthorizedError('Account is inactive');

    const valid = await this.passwordHasher.verify(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    user.recordLogin();
    await this.userRepo.update(user);

    const access = this.tokenService.generateAccessTokenSync({
      userId: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refresh = this.tokenService.generateRefreshTokenSync({ userId: user.id });

    const tokenHash = await this.passwordHasher.hash(refresh.token);
    const refreshTokenEntity = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: refresh.expiresAt,
      ipAddress,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(refreshTokenEntity);

    const session = new Session({
      id: crypto.randomUUID(),
      userId: user.id,
      token: refresh.token,
      ipAddress,
      userAgent,
      expiresAt: refresh.expiresAt,
      createdAt: new Date(),
    });
    await this.sessionRepo.create(session);

    return {
      user,
      accessToken: access.token,
      refreshToken: refresh.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshTokenExpiresAt: refresh.expiresAt,
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
      phone: data.phone ? PhoneNumber.create(data.phone) : undefined,
      role: data.role ?? UserRole.CLIENT,
      status: UserStatus.ACTIVE,
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
    const { userId } = this.tokenService.verifyRefreshTokenSync(refreshToken);

    const tokenHash = await this.passwordHasher.hash(refreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    await this.refreshTokenRepo.revoke(stored.id);

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const access = this.tokenService.generateAccessTokenSync({
      userId: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refresh = this.tokenService.generateRefreshTokenSync({ userId: user.id });

    const newTokenHash = await this.passwordHasher.hash(refresh.token);
    const newRefreshToken = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: refresh.expiresAt,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(newRefreshToken);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = await this.passwordHasher.hash(refreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (stored) await this.refreshTokenRepo.revoke(stored.id);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
