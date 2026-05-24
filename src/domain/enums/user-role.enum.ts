export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  COSMETOLOGIST = 'COSMETOLOGIST',
  MASSAGIST = 'MASSAGIST',
  CLIENT = 'CLIENT',
}

export const USER_ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 7,
  [UserRole.ADMIN]: 6,
  [UserRole.MANAGER]: 5,
  [UserRole.RECEPTIONIST]: 4,
  [UserRole.COSMETOLOGIST]: 3,
  [UserRole.MASSAGIST]: 2,
  [UserRole.CLIENT]: 1,
};

/** Roles that perform specialist work (cosmetology / massage) */
export const SPECIALIST_ROLES: UserRole[] = [UserRole.COSMETOLOGIST, UserRole.MASSAGIST];

/** All employee roles (everyone except CLIENT) */
export const EMPLOYEE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.RECEPTIONIST,
  UserRole.COSMETOLOGIST,
  UserRole.MASSAGIST,
];

/** Roles with admin/management privileges */
export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

/** Roles that can manage front-desk operations */
export const FRONT_DESK_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.RECEPTIONIST,
];

export function canManage(targetRole: UserRole, actorRole: UserRole): boolean {
  return USER_ROLE_HIERARCHY[actorRole] > USER_ROLE_HIERARCHY[targetRole];
}

export function canManageOrEqual(targetRole: UserRole, actorRole: UserRole): boolean {
  return USER_ROLE_HIERARCHY[actorRole] >= USER_ROLE_HIERARCHY[targetRole];
}

export function isSpecialistRole(role: string): boolean {
  return role === UserRole.COSMETOLOGIST || role === UserRole.MASSAGIST;
}

export function isFrontDeskRole(role: string): boolean {
  return FRONT_DESK_ROLES.includes(role as UserRole);
}
