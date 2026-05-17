export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  SPECIALIST = 'SPECIALIST',
  CLIENT = 'CLIENT',
}

export const USER_ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.OPERATOR]: 3,
  [UserRole.SPECIALIST]: 2,
  [UserRole.CLIENT]: 1,
};

export function canManage(targetRole: UserRole, actorRole: UserRole): boolean {
  return USER_ROLE_HIERARCHY[actorRole] > USER_ROLE_HIERARCHY[targetRole];
}

export function canManageOrEqual(targetRole: UserRole, actorRole: UserRole): boolean {
  return USER_ROLE_HIERARCHY[actorRole] >= USER_ROLE_HIERARCHY[targetRole];
}
