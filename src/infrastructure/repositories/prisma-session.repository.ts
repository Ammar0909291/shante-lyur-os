import { PrismaClient } from '@prisma/client';
import { ISessionRepository } from '@/application/ports/session-repository.port';
import { Session, SessionProps } from '@/domain/entities/session.entity';

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string;
    userId: string;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    expiresAt: Date;
  }): Session {
    const props: SessionProps = {
      id: raw.id,
      userId: raw.userId,
      token: raw.token,
      ipAddress: raw.ipAddress ?? undefined,
      userAgent: raw.userAgent ?? undefined,
      createdAt: raw.createdAt,
      expiresAt: raw.expiresAt,
    };
    return new Session(props);
  }

  async findByToken(token: string): Promise<Session | null> {
    const raw = await this.db.session.findUnique({ where: { token } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByUser(userId: string): Promise<Session[]> {
    const raws = await this.db.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(session: Session): Promise<Session> {
    const raw = await this.db.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        token: session.token,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
    return this.toDomain(raw);
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.session.delete({ where: { token } });
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
