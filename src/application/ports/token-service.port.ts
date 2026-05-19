export type TokenServicePort = ITokenService;
export interface ITokenService {
  generateAccessToken(payload: Record<string, unknown>): Promise<string>;
  generateRefreshToken(payload: Record<string, unknown>): Promise<string>;
  verifyAccessToken(token: string): Promise<Record<string, unknown>>;
  verifyRefreshToken(token: string): Promise<Record<string, unknown>>;
  decode(token: string): Record<string, unknown> | null;
}
