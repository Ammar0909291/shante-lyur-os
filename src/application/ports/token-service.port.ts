export type TokenServicePort = ITokenService;

export interface ITokenService {
  generateAccessToken(payload: { userId: string; email: string; role: string }): { token: string; expiresAt: Date };
  generateRefreshToken(payload: { userId: string }): { token: string; expiresAt: Date };
  verifyAccessToken(token: string): { userId: string; email: string; role: string; jti: string };
  verifyRefreshToken(token: string): { userId: string; jti: string };
  decodeToken?(token: string): { userId: string; email: string; role: string } | null;
  decode?(token: string): Record<string, unknown> | null;
}
