import { PrismaClient, Prisma, User as PrismaUser } from '@prisma/client';
import { IUserRepository } from '@/application/ports/user-repository.port';
import { User } from '@/domain/entities/user.entity';
import { UserRole } from '@/domain/enums/user-role.enum';
import { UserStatus } from '@/domain/enums/user-status.enum';
import { Email } from '@/domain/value-objects/email.vo';
import { PhoneNumber } from '@/domain/value-objects/phone-number.vo';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaUser): User {
    return User.reconstitute({
      id: raw.id,
      email: Email.create(raw.email).getValue(),
      phone: raw.phone ? PhoneNumber.create(raw.phone).getValue() : undefined,
      passwordHash: raw.passwordHash,
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: raw.role as UserRole,
      status: raw.status as UserStatus,
      emailVerified: raw.emailVerified,
      phoneVerified: raw.phoneVerified,
      avatarUrl: raw.avatarUrl ?? undefined,
      lastLoginAt: raw.lastLoginAt ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
    });
  }

  async findById(id: string): Promise<User | null> {
    const raw = await this.db.user.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const raw = await this.db.user.findUnique({ where: { email } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const raw = await this.db.user.findUnique({ where: { phone } });
    return raw ? this.toDomain(raw) : null;
  }

  async findMany(options: { role?: UserRole; status?: UserStatus; search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{ items: User[]; total: number }> {
    const { role, status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) where.OR = [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }];

    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.db.user.count({ where }),
    ]);

    return { items: items.map(r => this.toDomain(r)), total };
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.db.user.count({ where: { role } });
  }

  async create(user: User): Promise<User> {
    const raw = await this.db.user.create({
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        avatarUrl: user.avatarUrl,
        metadata: user.metadata as Prisma.InputJsonValue,
      },
    });
    return this.toDomain(raw);
  }

  async update(user: User): Promise<User> {
    const raw = await this.db.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
        metadata: user.metadata as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } });
  }

  async exists(email: string): Promise<boolean> {
    const count = await this.db.user.count({ where: { email } });
    return count > 0;
  }
}
