import { RefreshToken } from '@/domain/entities';

export interface IRefreshTokenRepository {
  findByTokenHash(hash: string): Promise<RefreshToken | null>;
  findByUser(userId: string): Promise<RefreshToken[]>;
  create(token: RefreshToken): Promise<RefreshToken>;
  update(token: RefreshToken): Promise<RefreshToken>;
  revoke(tokenId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
