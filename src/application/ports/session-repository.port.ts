import { Session } from '@/domain/entities';

export type SessionRepositoryPort = ISessionRepository;

export interface ISessionRepository {
  findByToken(token: string): Promise<Session | null>;
  findByUser(userId: string): Promise<Session[]>;
  create(session: Session): Promise<Session>;
  deleteByToken(token: string): Promise<void>;
  deleteByUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
