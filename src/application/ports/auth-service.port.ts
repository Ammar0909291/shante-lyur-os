import { User } from '@/domain/entities/user.entity';
import { UserRole } from '@/domain/enums/user-role.enum';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface IAuthService {
  authenticate(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult>;
  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
  }): Promise<User>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: Date; refreshTokenExpiresAt: Date }>;
  logout(refreshToken: string): Promise<void>;
  logoutAllDevices(userId: string): Promise<void>;
}
