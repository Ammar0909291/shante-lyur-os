import { PrismaClient } from '@prisma/client';
import { ISessionRepository } from '@/application/ports/session-repository.port';
import { Session } from '@/domain/entities/session.entity';

type PrismaSession = {
  id: string;
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  createdAt: Date;
};

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaSession): Session {
    return Session.reconstitute({
      id: raw.id,
      userId: raw.userId,
      token: raw.token,
      ipAddress: raw.ipAddress ?? undefined,
      userAgent: raw.userAgent ?? undefined,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
    });
  }

  async findByToken(token: string): Promise<Session | null> {
    const raw = await this.db.session.findFirst({ where: { token } });
    return raw ? this.toDomain(raw as PrismaSession) : null;
  }

  async findByUser(userId: string): Promise<Session[]> {
    const raws = await this.db.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r as PrismaSession));
  }

  async create(session: Session): Promise<Session> {
    const raw = await this.db.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        token: session.token,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
    return this.toDomain(raw as PrismaSession);
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.session.deleteMany({ where: { token } });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.db.session.deleteMany({ where: { userId } });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
