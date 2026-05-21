import { createHash } from 'crypto';
import { UnauthorizedError } from '@/domain/errors';
import { RefreshToken } from '@/domain/entities';

function sha256Token(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
import {
  IUserRepository,
  IRefreshTokenRepository,
  IPasswordHasher,
  ITokenService,
} from '@/application/ports';
import { RefreshTokenDto } from '@/application/dto';

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    _passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<RefreshResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const userId = payload.sub as string;
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const tokenHash = sha256Token(dto.refreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);
    if (!stored || !stored.isValid) {
      // Security: revoke all tokens for this user if token reuse detected
      if (stored && stored.isRevoked) {
        await this.refreshTokenRepo.revokeAllForUser(userId);
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await stored.revoke();
    await this.refreshTokenRepo.update(stored);

    const newAccessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const newRefreshTokenStr = await this.tokenService.generateRefreshToken({
      sub: user.id,
      version: Date.now(),
    });

    const newRefreshToken = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: sha256Token(newRefreshTokenStr),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      replacedBy: stored.id,
      createdAt: new Date(),
    });

    await this.refreshTokenRepo.create(newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshTokenStr };
  }
}
