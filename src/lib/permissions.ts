/**
 * Central role/permission definitions for Shante Lyur OS.
 *
 * Keep this file the single source of truth for:
 *   - role groupings
 *   - page-level access rules
 *   - named permission checks
 *
 * Usage in middleware (server):  import from '@/lib/permissions'
 * Usage in components (client):  use the hasRole/can helpers from auth-context
 */

// ── Role groupings ────────────────────────────────────────────────────────────

export const STAFF_ROLES    = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'SPECIALIST'] as const;
export const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'] as const;
export const ADMIN_ROLES    = ['SUPER_ADMIN', 'ADMIN'] as const;
export const SUPER_ADMIN_ROLES = ['SUPER_ADMIN'] as const;

export type StaffRole = typeof STAFF_ROLES[number];
export type ManagementRole = typeof MANAGEMENT_ROLES[number];

// ── Page-level access ─────────────────────────────────────────────────────────
//
// Defines which pages each role is BLOCKED from.
// Authenticated users not in this map have full access.
// CLIENT role is blocked from the entire dashboard.

export const ROLE_BLOCKED_PAGES: Record<string, string[]> = {
  SPECIALIST: ['/analytics', '/settings', '/specialists', '/services'],
  OPERATOR:   ['/analytics', '/settings'],
  // CLIENT should not be in the dashboard at all → handled separately
};

// Dashboard root — if a role hits '/', redirect here
export const DEFAULT_REDIRECT: Record<string, string> = {
  SPECIALIST: '/bookings?view=timeline',
  OPERATOR:   '/dashboard',
  ADMIN:      '/dashboard',
  SUPER_ADMIN: '/dashboard',
};

// ── Named permissions ─────────────────────────────────────────────────────────

export type Permission =
  | 'bookings:read'
  | 'bookings:write'
  | 'clients:read'
  | 'clients:write'
  | 'specialists:read'
  | 'specialists:write'
  | 'services:read'
  | 'services:write'
  | 'analytics:read'
  | 'settings:write';

const PERMISSION_MAP: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    'bookings:read', 'bookings:write',
    'clients:read', 'clients:write',
    'specialists:read', 'specialists:write',
    'services:read', 'services:write',
    'analytics:read', 'settings:write',
  ],
  ADMIN: [
    'bookings:read', 'bookings:write',
    'clients:read', 'clients:write',
    'specialists:read', 'specialists:write',
    'services:read', 'services:write',
    'analytics:read', 'settings:write',
  ],
  OPERATOR: [
    'bookings:read', 'bookings:write',
    'clients:read', 'clients:write',
    'specialists:read',
    'services:read',
  ],
  SPECIALIST: [
    'bookings:read',
    'clients:read',
    'services:read',
  ],
  CLIENT: [
    'bookings:read',
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  return (PERMISSION_MAP[role] ?? []).includes(permission);
}

export function isStaff(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isManagement(role: string): boolean {
  return (MANAGEMENT_ROLES as readonly string[]).includes(role);
}

export function isAdmin(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

/** Returns the page redirect URL for a role that hits a blocked page. */
export function blockedRedirect(role: string): string {
  return DEFAULT_REDIRECT[role] ?? '/dashboard';
}
