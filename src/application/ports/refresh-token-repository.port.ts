import { RefreshToken } from '@/domain/entities';

export type RefreshTokenRepositoryPort = IRefreshTokenRepository;

export interface IRefreshTokenRepository {
  findByToken(token: string): Promise<RefreshToken | null>;
  findByTokenHash?(hash: string): Promise<RefreshToken | null>;
  findByUser(userId: string): Promise<RefreshToken[]>;
  create(token: RefreshToken): Promise<RefreshToken>;
  update(token: RefreshToken): Promise<RefreshToken>;
  revoke(token: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
