import { PrismaClient } from '@prisma/client';
import { SessionRepositoryPort } from '@/application/ports/session-repository.port';
import { Session } from '@/domain/entities/session.entity';

export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; userId: string; ipAddress: string | null; userAgent: string | null; createdAt: Date; expiresAt: Date }): Session {
    return Session.reconstitute({
      id: raw.id,
      userId: raw.userId,
      ipAddress: raw.ipAddress ?? undefined,
      userAgent: raw.userAgent ?? undefined,
      createdAt: raw.createdAt,
      expiresAt: raw.expiresAt,
    });
  }

  async findById(id: string): Promise<Session | null> {
    const raw = await this.db.session.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const raws = await this.db.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(session: Session): Promise<Session> {
    const raw = await this.db.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.session.delete({ where: { id } });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
