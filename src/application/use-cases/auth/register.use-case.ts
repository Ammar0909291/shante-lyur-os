import { createHash } from 'crypto';
import { User, RefreshToken } from '@/domain/entities';
import { UserRole, UserStatus } from '@/domain/enums';
import { Email, PhoneNumber } from '@/domain/value-objects';
import { ConflictError, ValidationError } from '@/domain/errors';
import { UserRegisteredEvent } from '@/domain/events';
import {
  IUserRepository,
  IRefreshTokenRepository,
  IPasswordHasher,
  ITokenService,
  IEmailService,
  IEventBus,
} from '@/application/ports';
import { RegisterUserDto } from '@/application/dto';

export interface RegisterResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class RegisterUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly emailService: IEmailService,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: RegisterUserDto, ipAddress?: string): Promise<RegisterResult> {
    const email = Email.create(dto.email);

    if (await this.userRepo.exists(email.value)) {
      throw new ConflictError('User with this email already exists', 'email');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const phone = dto.phone ? PhoneNumber.create(dto.phone) : undefined;

    const user = new User({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone,
      role: dto.role as UserRole,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerified: false,
      phoneVerified: false,
      failedLogins: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.userRepo.create(user);

    const accessToken = await this.tokenService.generateAccessToken({
      sub: saved.id,
      email: saved.email.value,
      role: saved.role,
    });

    const refreshTokenStr = await this.tokenService.generateRefreshToken({
      sub: saved.id,
      version: 1,
    });

    const refreshToken = new RefreshToken({
      id: crypto.randomUUID(),
      userId: saved.id,
      tokenHash: createHash('sha256').update(refreshTokenStr).digest('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress,
      createdAt: new Date(),
    });

    await this.refreshTokenRepo.create(refreshToken);

    await this.emailService.sendTemplate(saved.email.value, 'welcome', {
      firstName: saved.firstName,
      verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${crypto.randomUUID()}&id=${saved.id}`,
    });

    await this.eventBus.publish(
      new UserRegisteredEvent(saved.id, {
        email: saved.email.value,
        firstName: saved.firstName,
        lastName: saved.lastName,
        role: saved.role,
      })
    );

    return { user: saved, accessToken, refreshToken: refreshTokenStr };
  }
}
