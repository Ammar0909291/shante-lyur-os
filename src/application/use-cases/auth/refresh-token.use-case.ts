import { UnauthorizedError } from '@/domain/errors';
import { RefreshToken } from '@/domain/entities';

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
import {
  IUserRepository,
  IRefreshTokenRepository,
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

    const tokenHash = await sha256Hex(dto.refreshToken);
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
      tokenHash: await sha256Hex(newRefreshTokenStr),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      replacedBy: stored.id,
      createdAt: new Date(),
    });

    await this.refreshTokenRepo.create(newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshTokenStr };
  }
}
