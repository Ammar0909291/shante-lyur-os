import { PrismaClient } from '@prisma/client';
import { RefreshTokenRepositoryPort } from '@/application/ports/refresh-token-repository.port';
import { RefreshToken } from '@/domain/entities/refresh-token.entity';

export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(raw: any): RefreshToken {
    return RefreshToken.reconstitute({
      id: raw.id,
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      expiresAt: raw.expiresAt,
      revokedAt: raw.revokedAt ?? undefined,
      replacedBy: raw.replacedBy ?? undefined,
      ipAddress: raw.ipAddress ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const raw = await this.db.refreshToken.findFirst({ where: { tokenHash: token } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const raw = await this.db.refreshToken.findFirst({ where: { tokenHash: hash } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUser(userId: string): Promise<RefreshToken[]> {
    const raws = await this.db.refreshToken.findMany({ where: { userId } });
    return raws.map(r => this.toDomain(r));
  }

  async create(rt: RefreshToken): Promise<RefreshToken> {
    const raw = await this.db.refreshToken.create({
      data: {
        id: rt.id,
        userId: rt.userId,
        tokenHash: rt.tokenHash,
        expiresAt: rt.expiresAt,
        ipAddress: rt.ipAddress,
        createdAt: rt.createdAt,
      },
    });
    return this.toDomain(raw);
  }

  async update(rt: RefreshToken): Promise<RefreshToken> {
    const raw = await this.db.refreshToken.update({
      where: { id: rt.id },
      data: {
        revokedAt: rt.revokedAt,
        replacedBy: rt.replacedBy,
      },
    });
    return this.toDomain(raw);
  }

  async revoke(token: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { tokenHash: token },
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
