import { BaseEntity } from './base.entity';
import { UserRole, UserStatus, canManage } from '../enums';
import { Email } from '../value-objects/email.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { ForbiddenError } from '../errors';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: PhoneNumber;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  failedLogins: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends BaseEntity {
  private _passwordHash: string;
  private _status: UserStatus;
  private _failedLogins: number;
  private _lockedUntil?: Date;

  constructor(private readonly props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._passwordHash = props.passwordHash;
    this._status = props.status;
    this._failedLogins = props.failedLogins;
    this._lockedUntil = props.lockedUntil;
  }

  get email(): Email { return this.props.email; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get phone(): PhoneNumber | undefined { return this.props.phone; }
  get role(): UserRole { return this.props.role; }
  get status(): UserStatus { return this._status; }
  get emailVerified(): boolean { return this.props.emailVerified; }
  get phoneVerified(): boolean { return this.props.phoneVerified; }
  get lastLoginAt(): Date | undefined { return this.props.lastLoginAt; }
  get failedLogins(): number { return this._failedLogins; }
  get lockedUntil(): Date | undefined { return this._lockedUntil; }
  get isLocked(): boolean {
    return !!this._lockedUntil && this._lockedUntil > new Date();
  }
  get isActive(): boolean {
    return this._status === UserStatus.ACTIVE && !this.isLocked;
  }
  get passwordHash(): string { return this._passwordHash; }
  get avatarUrl(): string | undefined { return this.props.avatarUrl; }

  recordLogin(): void {
    this._failedLogins = 0;
    this._lockedUntil = undefined;
    (this.props as UserProps).lastLoginAt = new Date();
  }

  recordFailedLogin(maxAttempts: number = 5, lockDurationMinutes: number = 30): void {
    this._failedLogins += 1;
    if (this._failedLogins >= maxAttempts) {
      this._lockedUntil = new Date(Date.now() + lockDurationMinutes * 60000);
    }
  }

  changePassword(newHash: string): void {
    this._passwordHash = newHash;
    this.updatedAt = new Date();
  }

  verifyEmail(): void {
    (this.props as UserProps).emailVerified = true;
    if (this._status === UserStatus.PENDING_VERIFICATION) {
      this._status = UserStatus.ACTIVE;
    }
    this.updatedAt = new Date();
  }

  verifyPhone(): void {
    (this.props as UserProps).phoneVerified = true;
    this.updatedAt = new Date();
  }

  changeRole(newRole: UserRole, actorRole: UserRole, actorId: string): void {
    if (actorId === this.id && newRole !== this.role) {
      throw new ForbiddenError('Cannot change your own role');
    }
    if (this.role === UserRole.SUPER_ADMIN && newRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Cannot demote SUPER_ADMIN');
    }
    (this.props as UserProps).role = newRole;
    this.updatedAt = new Date();
  }

  suspend(): void {
    if (this.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Cannot suspend SUPER_ADMIN');
    }
    this._status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  activate(): void {
    this._status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Cannot deactivate SUPER_ADMIN');
    }
    this._status = UserStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  can(action: string, targetRole?: UserRole): boolean {
    const matrix: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.ADMIN]: [
        'user:read', 'user:create', 'user:update', 'user:delete',
        'specialist:read', 'specialist:create', 'specialist:update',
        'service:crud', 'location:crud',
        'appointment:read', 'appointment:update', 'appointment:cancel',
        'payment:read', 'payment:refund',
        'promo:crud', 'report:read',
        'audit:read', 'settings:read', 'settings:update',
      ],
      [UserRole.OPERATOR]: [
        'user:read', 'user:create',
        'appointment:read', 'appointment:create', 'appointment:update', 'appointment:cancel',
        'payment:read',
        'report:read',
      ],
      [UserRole.SPECIALIST]: [
        'appointment:read', 'appointment:update_status',
        'customer_profile:read', 'specialist_note:crud',
        'procedure_history:read', 'procedure_history:create',
      ],
      [UserRole.CLIENT]: [
        'appointment:create', 'appointment:read_own', 'appointment:cancel_own',
        'customer_profile:read_own', 'customer_profile:update_own',
        'payment:read_own',
      ],
    };

    const permissions = matrix[this.role] ?? [];
    if (permissions.includes('*')) return true;
    if (!permissions.includes(action)) return false;
    if (targetRole && !canManage(targetRole, this.role)) return false;
    return true;
  }
}
