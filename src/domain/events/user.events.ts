import { BaseDomainEvent } from './domain-event';
import { UserRole } from '../enums';

export class UserRegisteredEvent extends BaseDomainEvent {
  constructor(
    userId: string,
    payload: {
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
    }
  ) {
    super('USER_REGISTERED', userId, 'User', payload);
  }
}

export class UserVerifiedEvent extends BaseDomainEvent {
  constructor(
    userId: string,
    payload: { verifiedAt: string; method: 'EMAIL' | 'PHONE' }
  ) {
    super('USER_VERIFIED', userId, 'User', payload);
  }
}

export class UserRoleChangedEvent extends BaseDomainEvent {
  constructor(
    userId: string,
    payload: {
      oldRole: UserRole;
      newRole: UserRole;
      changedBy: string;
    }
  ) {
    super('USER_ROLE_CHANGED', userId, 'User', payload);
  }
}

export class UserPasswordChangedEvent extends BaseDomainEvent {
  constructor(
    userId: string,
    payload: { changedAt: string; changedBy?: string }
  ) {
    super('USER_PASSWORD_CHANGED', userId, 'User', payload);
  }
}
