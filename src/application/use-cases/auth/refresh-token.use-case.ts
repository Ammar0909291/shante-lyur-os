import { UnauthorizedError } from '@/domain/errors';
import { RefreshToken } from '@/domain/entities';
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
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<RefreshResult> {
    let payload: { userId: string; jti: string };
    try {
      payload = this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const userId = payload.userId;
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const stored = await this.refreshTokenRepo.findByToken(dto.refreshToken);
    if (!stored || !stored.isValid) {
      // Security: revoke all tokens for this user if token reuse detected
      if (stored && stored.isRevoked) {
        await this.refreshTokenRepo.revokeAllForUser(userId);
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    stored.revoke();
    await this.refreshTokenRepo.update(stored);

    const newAccessResult = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.value,
      role: user.role,
    });

    const newRefreshResult = this.tokenService.generateRefreshToken({
      userId: user.id,
    });

    const newRefreshToken = new RefreshToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: await this.passwordHasher.hash(newRefreshResult.token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      replacedBy: stored.id,
      createdAt: new Date(),
    });

    await this.refreshTokenRepo.create(newRefreshToken);

    return { accessToken: newAccessResult.token, refreshToken: newRefreshResult.token };
  }
}
