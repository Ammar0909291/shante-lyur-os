import { AuthServicePort } from '@/application/ports/auth-service.port';
import { UserRepositoryPort } from '@/application/ports/user-repository.port';
import { PasswordHasherPort } from '@/application/ports/password-hasher.port';
import { TokenServicePort } from '@/application/ports/token-service.port';
import { RefreshTokenRepositoryPort } from '@/application/ports/refresh-token-repository.port';
import { SessionRepositoryPort } from '@/application/ports/session-repository.port';
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
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
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
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedError('Account is blocked');
    if (user.status === UserStatus.INACTIVE) throw new UnauthorizedError('Account is inactive');

    const hashFn = this.passwordHasher.compare ?? this.passwordHasher.verify;
    const valid = hashFn ? await hashFn.call(this.passwordHasher, password, user.passwordHash) : false;
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    user.recordLogin();
    await this.userRepo.update(user);

    const access = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.toString(),
      role: user.role,
    });

    const refresh = this.tokenService.generateRefreshToken({ userId: user.id });

    const refreshTokenEntity = RefreshToken.create({
      token: refresh.token,
      userId: user.id,
      expiresAt: refresh.expiresAt,
    });
    await this.refreshTokenRepo.create(refreshTokenEntity);

    const session = Session.create({
      userId: user.id,
      ipAddress,
      userAgent,
      expiresAt: refresh.expiresAt,
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

    const user = User.create({
      email: Email.create(data.email),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role ?? UserRole.CLIENT,
    });

    return this.userRepo.create(user);
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: Date; refreshTokenExpiresAt: Date }> {
    const { userId } = this.tokenService.verifyRefreshToken(refreshToken);

    const stored = await this.refreshTokenRepo.findByToken(refreshToken);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    await this.refreshTokenRepo.revoke(refreshToken);

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const access = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.toString(),
      role: user.role,
    });

    const refresh = this.tokenService.generateRefreshToken({ userId: user.id });

    const newRefreshToken = RefreshToken.create({
      token: refresh.token,
      userId: user.id,
      expiresAt: refresh.expiresAt,
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
    await this.refreshTokenRepo.revoke(refreshToken);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
