import { PrismaClient } from '@prisma/client';
import { RefreshTokenRepositoryPort } from '@/application/ports/refresh-token-repository.port';
import { RefreshToken } from '@/domain/entities/refresh-token.entity';

export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; token: string; userId: string; expiresAt: Date; createdAt: Date; revokedAt: Date | null }): RefreshToken {
    return RefreshToken.reconstitute({
      id: raw.id,
      token: raw.token,
      userId: raw.userId,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
      revokedAt: raw.revokedAt ?? undefined,
    });
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const raw = await this.db.refreshToken.findUnique({ where: { token } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    const raws = await this.db.refreshToken.findMany({ where: { userId } });
    return raws.map(r => this.toDomain(r));
  }

  async create(rt: RefreshToken): Promise<RefreshToken> {
    const raw = await this.db.refreshToken.create({
      data: {
        id: rt.id,
        token: rt.token,
        userId: rt.userId,
        expiresAt: rt.expiresAt,
        createdAt: rt.createdAt,
      },
    });
    return this.toDomain(raw);
  }

  async revoke(token: string): Promise<void> {
    await this.db.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
