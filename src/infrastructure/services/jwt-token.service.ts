import jwt from 'jsonwebtoken';
import { ITokenService } from '@/application/ports/token-service.port';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export class JwtTokenService implements ITokenService {
  private readonly ACCESS_SECRET: string;
  private readonly REFRESH_SECRET: string;
  private readonly ACCESS_EXPIRY = 15 * 60; // 15 minutes
  private readonly REFRESH_EXPIRY = 7 * 24 * 60 * 60; // 7 days

  constructor() {
    this.ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me';
    this.REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me';
  }

  async generateAccessToken(payload: Record<string, unknown>): Promise<string> {
    const jti = crypto.randomUUID();
    return jwt.sign(
      { sub: payload.userId, email: payload.email, role: payload.role, jti, type: 'access' },
      this.ACCESS_SECRET,
      { expiresIn: this.ACCESS_EXPIRY }
    );
  }

  async generateRefreshToken(payload: Record<string, unknown>): Promise<string> {
    const jti = crypto.randomUUID();
    return jwt.sign(
      { sub: payload.userId, jti, type: 'refresh' },
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_EXPIRY }
    );
  }

  async verifyAccessToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.ACCESS_SECRET) as TokenPayload;
      if (decoded.type !== 'access') throw new UnauthorizedError('Invalid token type');
      return { userId: decoded.sub, email: decoded.email, role: decoded.role, jti: decoded.jti };
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.REFRESH_SECRET) as TokenPayload;
      if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid token type');
      return { userId: decoded.sub, jti: decoded.jti };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  decode(token: string): Record<string, unknown> | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload | null;
      if (!decoded || decoded.type !== 'access') return null;
      return { userId: decoded.sub, email: decoded.email, role: decoded.role };
    } catch {
      return null;
    }
  }
}
