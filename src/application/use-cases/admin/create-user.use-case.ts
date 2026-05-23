import { User } from '@/domain/entities';
import { UserRole, UserStatus } from '@/domain/enums';
import { Email, PhoneNumber } from '@/domain/value-objects';
import { ConflictError, ForbiddenError } from '@/domain/errors';
import {
  IUserRepository,
  IPasswordHasher,
  IAuditLogRepository,
} from '@/application/ports';
import { CreateUserDto } from '@/application/dto';
import { AuditLog } from '@/domain/entities';
import { AuditAction } from '@/domain/enums';

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(dto: CreateUserDto, actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.CLIENT || actorRole === UserRole.SPECIALIST) {
      throw new ForbiddenError();
    }

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
      status: dto.status as UserStatus,
      emailVerified: true, // Admin-created users are pre-verified
      phoneVerified: false,
      failedLogins: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.userRepo.create(user);

    await this.auditLogRepo.create(
      AuditLog.create({
        userId: actorId,
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: saved.id,
        newValues: { email: saved.email.value, role: saved.role },
      })
    );

    return { user: saved };
  }
}
