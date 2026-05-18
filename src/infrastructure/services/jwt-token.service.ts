import jwt from 'jsonwebtoken';
import { ITokenService } from '@/application/ports/token-service.port';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';

export class JwtTokenService implements ITokenService {
  private readonly ACCESS_SECRET: string;
  private readonly REFRESH_SECRET: string;
  private readonly ACCESS_EXPIRY = 15 * 60;
  private readonly REFRESH_EXPIRY = 7 * 24 * 60 * 60;

  constructor() {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET environment variable is required');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET environment variable is required');
    this.ACCESS_SECRET = accessSecret;
    this.REFRESH_SECRET = refreshSecret;
  }

  async generateAccessToken(payload: Record<string, unknown>): Promise<string> {
    const jti = crypto.randomUUID();
    return jwt.sign(
      { ...payload, jti, type: 'access' },
      this.ACCESS_SECRET,
      { expiresIn: this.ACCESS_EXPIRY },
    );
  }

  async generateRefreshToken(payload: Record<string, unknown>): Promise<string> {
    const jti = crypto.randomUUID();
    return jwt.sign(
      { ...payload, jti, type: 'refresh' },
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_EXPIRY },
    );
  }

  async verifyAccessToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.ACCESS_SECRET) as Record<string, unknown>;
      if (decoded['type'] !== 'access') throw new UnauthorizedError('Invalid token type');
      return decoded;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.REFRESH_SECRET) as Record<string, unknown>;
      if (decoded['type'] !== 'refresh') throw new UnauthorizedError('Invalid token type');
      return decoded;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  decode(token: string): Record<string, unknown> | null {
    try {
      return jwt.decode(token) as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }
}
