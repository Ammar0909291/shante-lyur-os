import jwt from 'jsonwebtoken';
import { ITokenService } from '@/application/ports/token-service.port';
import { UnauthorizedError } from '@/domain/errors/unauthorized-error';

export class JwtTokenService implements ITokenService {
  private readonly ACCESS_SECRET: string;
  private readonly REFRESH_SECRET: string;
  // Access token lives 15 minutes — short enough to limit damage from theft
  private readonly ACCESS_EXPIRY = 15 * 60;
  // Refresh token lives 7 days (30 if rememberMe, but that's handled at the repo layer)
  private readonly REFRESH_EXPIRY = 7 * 24 * 60 * 60;

  constructor() {
    this.ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  ?? 'dev-access-secret-change-me';
    this.REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me';
  }

  async generateAccessToken(payload: Record<string, unknown>): Promise<string> {
    const jti = crypto.randomUUID();
    return jwt.sign(
      {
        sub:   payload.sub,    // use cases pass { sub: user.id, email, role }
        email: payload.email,
        role:  payload.role,
        jti,
        type: 'access',
      },
      this.ACCESS_SECRET,
      { expiresIn: this.ACCESS_EXPIRY },
    );
  }

  async generateRefreshToken(payload: Record<string, unknown>): Promise<string> {
    const jti = crypto.randomUUID();
    return jwt.sign(
      {
        sub:  payload.sub,     // use cases pass { sub: user.id, version }
        jti,
        type: 'refresh',
      },
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_EXPIRY },
    );
  }

  async verifyAccessToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.ACCESS_SECRET) as Record<string, unknown>;
      if (decoded.type !== 'access') throw new UnauthorizedError('Invalid token type');
      return decoded;
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<Record<string, unknown>> {
    try {
      const decoded = jwt.verify(token, this.REFRESH_SECRET) as Record<string, unknown>;
      if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid token type');
      return decoded;
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  decode(token: string): Record<string, unknown> | null {
    try {
      const decoded = jwt.decode(token);
      return decoded && typeof decoded === 'object' ? (decoded as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}
