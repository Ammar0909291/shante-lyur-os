import { User } from '@/domain/entities';
import { UserRole, UserStatus } from '@/domain/enums';

export type UserRepositoryPort = IUserRepository;

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findMany(options: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: User[]; total: number }>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  exists(email: string): Promise<boolean>;
  countByRole(role: UserRole): Promise<number>;
}
