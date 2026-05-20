import jwt from 'jsonwebtoken';
import { TokenServicePort } from '@/application/ports/token-service.port';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';

interface TokenPayload {
  sub: string;
  email?: string;
  role?: string;
  jti: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export class JwtTokenService implements TokenServicePort {
  private readonly ACCESS_SECRET: string;
  private readonly REFRESH_SECRET: string;
  private readonly ACCESS_EXPIRY = 15 * 60;        // 15 minutes in seconds
  private readonly REFRESH_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    this.ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
    this.REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret-change-me';
  }

  // Port: generateAccessToken(payload: Record<string,unknown>): Promise<string>
  // Use-cases pass: { sub: userId, email, role }
  // AuthService (dead code) passes: { userId, email, role }
  // → accept both via payload.sub ?? payload.userId
  async generateAccessToken(payload: Record<string, unknown>): Promise<string> {
    const sub = (payload['sub'] ?? payload['userId']) as string;
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { sub, email: payload['email'], role: payload['role'], jti, type: 'access' },
      this.ACCESS_SECRET,
      { expiresIn: this.ACCESS_EXPIRY },
    );
    return token;
  }

  // Port: generateRefreshToken(payload: Record<string,unknown>): Promise<string>
  // Use-cases pass: { sub: userId, version? }
  async generateRefreshToken(payload: Record<string, unknown>): Promise<string> {
    const sub = (payload['sub'] ?? payload['userId']) as string;
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { sub, jti, type: 'refresh' },
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_EXPIRY },
    );
    return token;
  }

  // Port: verifyAccessToken(token): Promise<Record<string,unknown>>
  // Returns { sub, userId, email, role, jti } — callers use .sub or .userId
  async verifyAccessToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.ACCESS_SECRET) as TokenPayload;
      if (decoded.type !== 'access') throw new UnauthorizedError('Invalid token type');
      return {
        sub: decoded.sub,
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        jti: decoded.jti,
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  // Port: verifyRefreshToken(token): Promise<Record<string,unknown>>
  // RefreshTokenUseCase reads payload.sub for userId
  async verifyRefreshToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.REFRESH_SECRET) as TokenPayload;
      if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid token type');
      return { sub: decoded.sub, userId: decoded.sub, jti: decoded.jti };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  // Port: decode(token): Record<string,unknown> | null
  decode(token: string): Record<string, unknown> | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload | null;
      if (!decoded || decoded.type !== 'access') return null;
      return { sub: decoded.sub, userId: decoded.sub, email: decoded.email, role: decoded.role };
    } catch {
      return null;
    }
  }
}
