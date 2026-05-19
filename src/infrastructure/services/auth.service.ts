import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuthServicePort, AuthResult } from '@/application/ports/auth-service.port';
import { UserRepositoryPort } from '@/application/ports/user-repository.port';
import { PasswordHasherPort } from '@/application/ports/password-hasher.port';
import { TokenServicePort } from '@/application/ports/token-service.port';
import { RefreshTokenRepositoryPort } from '@/application/ports/refresh-token-repository.port';
import { SessionRepositoryPort } from '@/application/ports/session-repository.port';
import { User } from '@/domain/entities/user.entity';
import { RefreshToken } from '@/domain/entities/refresh-token.entity';
import { Session } from '@/domain/entities/session.entity';
import { Email } from '@/domain/value-objects/email.vo';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';
import { ConflictError } from '@/domain/errors/conflict-error';
import { NotFoundError } from '@/domain/errors/not-found-error';
import { UserRole } from '@/domain/enums/user-role.enum';
import { UserStatus } from '@/domain/enums/user-status.enum';

const ACCESS_TTL_MS = parseInt(process.env.ACCESS_TOKEN_TTL_SECONDS ?? '900', 10) * 1000;
const REFRESH_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_SECONDS ?? '2592000', 10) * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService implements AuthServicePort {
  constructor(
    private readonly userRepo: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async authenticate(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid credentials');
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedError('Account is suspended');
    if (user.status === UserStatus.INACTIVE) throw new UnauthorizedError('Account is inactive');
    if (user.isLocked) throw new UnauthorizedError('Account is temporarily locked');

    const valid = await this.passwordHasher.verify(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    user.recordLogin();
    await this.userRepo.update(user);

    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + ACCESS_TTL_MS);
    const refreshTokenExpiresAt = new Date(now + REFRESH_TTL_MS);

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refreshTokenStr = await this.tokenService.generateRefreshToken({ sub: user.id });

    const refreshTokenEntity = new RefreshToken({
      id: uuidv4(),
      userId: user.id,
      tokenHash: hashToken(refreshTokenStr),
      expiresAt: refreshTokenExpiresAt,
      ipAddress,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(refreshTokenEntity);

    const session = new Session({
      id: uuidv4(),
      userId: user.id,
      token: accessToken,
      ipAddress,
      userAgent,
      expiresAt: accessTokenExpiresAt,
      createdAt: new Date(),
    });
    await this.sessionRepo.create(session);

    return {
      user,
      accessToken,
      refreshToken: refreshTokenStr,
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
  }): Promise<AuthResult> {
    const exists = await this.userRepo.exists(data.email);
    if (exists) throw new ConflictError('User with this email already exists');

    const passwordHash = await this.passwordHasher.hash(data.password);

    const user = new User({
      id: uuidv4(),
      email: Email.create(data.email),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role ?? UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      phoneVerified: false,
      failedLogins: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await this.userRepo.create(user);

    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + ACCESS_TTL_MS);
    const refreshTokenExpiresAt = new Date(now + REFRESH_TTL_MS);

    const accessToken = await this.tokenService.generateAccessToken({
      sub: created.id,
      email: created.email.value,
      role: created.role,
    });

    const refreshTokenStr = await this.tokenService.generateRefreshToken({ sub: created.id });

    const refreshTokenEntity = new RefreshToken({
      id: uuidv4(),
      userId: created.id,
      tokenHash: hashToken(refreshTokenStr),
      expiresAt: refreshTokenExpiresAt,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(refreshTokenEntity);

    return {
      user: created,
      accessToken,
      refreshToken: refreshTokenStr,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: Date; refreshTokenExpiresAt: Date }> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const userId = payload['sub'] as string;
    if (!userId) throw new UnauthorizedError('Invalid refresh token');

    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (!stored || stored.isRevoked || stored.isExpired) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    await this.refreshTokenRepo.revoke(stored.id);

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + ACCESS_TTL_MS);
    const refreshTokenExpiresAt = new Date(now + REFRESH_TTL_MS);

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const newRefreshTokenStr = await this.tokenService.generateRefreshToken({ sub: user.id });

    const newRefreshToken = new RefreshToken({
      id: uuidv4(),
      userId: user.id,
      tokenHash: hashToken(newRefreshTokenStr),
      expiresAt: refreshTokenExpiresAt,
      replacedBy: stored.id,
      createdAt: new Date(),
    });
    await this.refreshTokenRepo.create(newRefreshToken);

    return {
      accessToken,
      refreshToken: newRefreshTokenStr,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (stored) {
      await this.refreshTokenRepo.revoke(stored.id);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
