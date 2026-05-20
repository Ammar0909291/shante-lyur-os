import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { IRefreshTokenRepository } from '@/application/ports/refresh-token-repository.port';
import { RefreshToken } from '@/domain/entities/refresh-token.entity';

export function sha256Token(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt: Date | null;
    replacedBy: string | null;
    ipAddress: string | null;
  }): RefreshToken {
    return new RefreshToken({
      id: raw.id,
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
      revokedAt: raw.revokedAt ?? undefined,
      replacedBy: raw.replacedBy ?? undefined,
      ipAddress: raw.ipAddress ?? undefined,
    });
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const raw = await this.db.refreshToken.findFirst({ where: { tokenHash: hash } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUser(userId: string): Promise<RefreshToken[]> {
    const rows = await this.db.refreshToken.findMany({ where: { userId } });
    return rows.map((r) => this.toDomain(r));
  }

  async create(token: RefreshToken): Promise<RefreshToken> {
    const raw = await this.db.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        ipAddress: token.ipAddress,
        createdAt: token.createdAt,
      },
    });
    return this.toDomain(raw);
  }

  async update(token: RefreshToken): Promise<RefreshToken> {
    const raw = await this.db.refreshToken.update({
      where: { id: token.id },
      data: {
        revokedAt: token.revokedAt ?? null,
        replacedBy: token.replacedBy ?? null,
      },
    });
    return this.toDomain(raw);
  }

  async revoke(tokenId: string): Promise<void> {
    await this.db.refreshToken.update({
      where: { id: tokenId },
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
